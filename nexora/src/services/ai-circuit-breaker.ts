/**
 * Provider Telemetry & Dynamic Circuit Breaker Engine.
 * Protects downstream AI cascade tiers from latency spikes and cascading failures
 * by instantly bypassing throttled or down providers (Gemini, OpenRouter, Groq).
 */

export type AIProvider = 'gemini' | 'openrouter' | 'groq';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ProviderTelemetry {
  provider: AIProvider;
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextProbeTime: number | null;
  totalSuccesses: number;
  totalFailures: number;
}

export const CIRCUIT_CONFIG = {
  FAILURE_THRESHOLD: 3, // 3 consecutive failures trip circuit to OPEN
  WINDOW_MS: 60_000, // 60-second sliding failure window
  COOLDOWN_MS: 120_000, // 120-second (2 minute) cooldown before HALF_OPEN trial probe
} as const;

interface ProviderState {
  consecutiveFailures: number;
  failureTimestamps: number[];
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  state: CircuitState;
  openedAt: number | null;
  totalSuccesses: number;
  totalFailures: number;
}

const providerStates: Record<AIProvider, ProviderState> = {
  gemini: {
    consecutiveFailures: 0,
    failureTimestamps: [],
    lastFailureTime: null,
    lastSuccessTime: null,
    state: 'CLOSED',
    openedAt: null,
    totalSuccesses: 0,
    totalFailures: 0,
  },
  openrouter: {
    consecutiveFailures: 0,
    failureTimestamps: [],
    lastFailureTime: null,
    lastSuccessTime: null,
    state: 'CLOSED',
    openedAt: null,
    totalSuccesses: 0,
    totalFailures: 0,
  },
  groq: {
    consecutiveFailures: 0,
    failureTimestamps: [],
    lastFailureTime: null,
    lastSuccessTime: null,
    state: 'CLOSED',
    openedAt: null,
    totalSuccesses: 0,
    totalFailures: 0,
  },
};

/**
 * Returns current circuit state for a given provider, handling automatic HALF_OPEN transition.
 */
export function getCircuitState(provider: AIProvider, now: number = Date.now()): CircuitState {
  const p = providerStates[provider];
  if (!p) return 'CLOSED';

  if (p.state === 'OPEN') {
    if (p.openedAt && now - p.openedAt >= CIRCUIT_CONFIG.COOLDOWN_MS) {
      p.state = 'HALF_OPEN';
      console.log(`[Circuit Breaker] ${provider.toUpperCase()} cooldown expired. State moved to HALF_OPEN (probing).`);
      return 'HALF_OPEN';
    }
    return 'OPEN';
  }

  return p.state;
}

/**
 * Checks whether a provider is available to receive requests.
 * Returns true if CLOSED or HALF_OPEN; false if OPEN (tripped/throttled).
 */
export function isProviderAvailable(provider: AIProvider, now: number = Date.now()): boolean {
  const state = getCircuitState(provider, now);
  return state !== 'OPEN';
}

/**
 * Records a successful request for a provider.
 * Resets failure counters and restores state to CLOSED.
 */
export function recordProviderSuccess(provider: AIProvider, now: number = Date.now()): void {
  const p = providerStates[provider];
  if (!p) return;

  const previousState = p.state;
  p.consecutiveFailures = 0;
  p.failureTimestamps = [];
  p.lastSuccessTime = now;
  p.openedAt = null;
  p.state = 'CLOSED';
  p.totalSuccesses += 1;

  if (previousState !== 'CLOSED') {
    console.log(`[Circuit Breaker] ${provider.toUpperCase()} trial probe SUCCEEDED. Circuit restored to CLOSED (Healthy).`);
  }
}

/**
 * Records a provider failure.
 * If 3 consecutive failures occur within 60s (or failure during HALF_OPEN probe),
 * trips the circuit to OPEN for a 120s cooldown.
 */
export function recordProviderFailure(
  provider: AIProvider,
  error?: unknown,
  now: number = Date.now()
): void {
  const p = providerStates[provider];
  if (!p) return;

  p.lastFailureTime = now;
  p.consecutiveFailures += 1;
  p.totalFailures += 1;
  p.failureTimestamps.push(now);

  // Prune failure timestamps older than sliding window (60s)
  const windowStart = now - CIRCUIT_CONFIG.WINDOW_MS;
  p.failureTimestamps = p.failureTimestamps.filter((t) => t >= windowStart);

  const errMsg = error instanceof Error ? error.message : String(error || '');

  // If in HALF_OPEN probe state, any failure immediately trips back to OPEN
  if (p.state === 'HALF_OPEN') {
    p.state = 'OPEN';
    p.openedAt = now;
    console.warn(
      `[Circuit Breaker] ${provider.toUpperCase()} trial probe FAILED (${errMsg}). Circuit re-tripped to OPEN for ${CIRCUIT_CONFIG.COOLDOWN_MS / 1000}s.`
    );
    return;
  }

  // If failures within window hit threshold, trip to OPEN
  if (p.failureTimestamps.length >= CIRCUIT_CONFIG.FAILURE_THRESHOLD) {
    p.state = 'OPEN';
    p.openedAt = now;
    console.warn(
      `[Circuit Breaker] ${provider.toUpperCase()} triggered ${p.failureTimestamps.length} failures in ${CIRCUIT_CONFIG.WINDOW_MS / 1000}s. Circuit TRIPPED to OPEN for ${CIRCUIT_CONFIG.COOLDOWN_MS / 1000}s.`
    );
  }
}

/**
 * Returns comprehensive telemetry metrics for all AI providers.
 */
export function getProviderTelemetry(now: number = Date.now()): Record<AIProvider, ProviderTelemetry> {
  const providers: AIProvider[] = ['gemini', 'openrouter', 'groq'];
  const telemetry = {} as Record<AIProvider, ProviderTelemetry>;

  for (const provider of providers) {
    const p = providerStates[provider];
    const currentState = getCircuitState(provider, now);
    const nextProbeTime =
      currentState === 'OPEN' && p.openedAt
        ? p.openedAt + CIRCUIT_CONFIG.COOLDOWN_MS
        : null;

    telemetry[provider] = {
      provider,
      state: currentState,
      consecutiveFailures: p.consecutiveFailures,
      lastFailureTime: p.lastFailureTime,
      lastSuccessTime: p.lastSuccessTime,
      nextProbeTime,
      totalSuccesses: p.totalSuccesses,
      totalFailures: p.totalFailures,
    };
  }

  return telemetry;
}

/**
 * Resets circuit breaker state (useful for tests or administrative reset).
 */
export function resetCircuitBreaker(provider?: AIProvider): void {
  const targets: AIProvider[] = provider ? [provider] : ['gemini', 'openrouter', 'groq'];

  for (const target of targets) {
    if (providerStates[target]) {
      providerStates[target] = {
        consecutiveFailures: 0,
        failureTimestamps: [],
        lastFailureTime: null,
        lastSuccessTime: null,
        state: 'CLOSED',
        openedAt: null,
        totalSuccesses: 0,
        totalFailures: 0,
      };
    }
  }
}
