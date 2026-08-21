import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCircuitState,
  isProviderAvailable,
  recordProviderSuccess,
  recordProviderFailure,
  getProviderTelemetry,
  resetCircuitBreaker,
  CIRCUIT_CONFIG,
} from '@/services/ai-circuit-breaker';

describe('AI Circuit Breaker & Rolling Telemetry Engine', () => {
  beforeEach(() => {
    resetCircuitBreaker();
  });

  it('starts in a healthy CLOSED state with isProviderAvailable returning true', () => {
    expect(getCircuitState('gemini')).toBe('CLOSED');
    expect(isProviderAvailable('gemini')).toBe(true);

    expect(getCircuitState('openrouter')).toBe('CLOSED');
    expect(isProviderAvailable('openrouter')).toBe(true);

    expect(getCircuitState('groq')).toBe('CLOSED');
    expect(isProviderAvailable('groq')).toBe(true);
  });

  it('trips circuit from CLOSED to OPEN after 3 consecutive failures within 60s', () => {
    const baseTime = 1_000_000;

    // Failure 1
    recordProviderFailure('gemini', new Error('HTTP 429'), baseTime);
    expect(getCircuitState('gemini', baseTime)).toBe('CLOSED');
    expect(isProviderAvailable('gemini', baseTime)).toBe(true);

    // Failure 2
    recordProviderFailure('gemini', new Error('HTTP 429'), baseTime + 5_000);
    expect(getCircuitState('gemini', baseTime + 5_000)).toBe('CLOSED');
    expect(isProviderAvailable('gemini', baseTime + 5_000)).toBe(true);

    // Failure 3 (Threshold hit)
    recordProviderFailure('gemini', new Error('RESOURCE_EXHAUSTED'), baseTime + 10_000);
    expect(getCircuitState('gemini', baseTime + 10_000)).toBe('OPEN');
    expect(isProviderAvailable('gemini', baseTime + 10_000)).toBe(false);
  });

  it('bypasses provider instantly while circuit is OPEN', () => {
    const baseTime = 1_000_000;

    for (let i = 0; i < 3; i++) {
      recordProviderFailure('openrouter', new Error('HTTP 503'), baseTime + i * 1000);
    }

    expect(getCircuitState('openrouter', baseTime + 3000)).toBe('OPEN');
    expect(isProviderAvailable('openrouter', baseTime + 3000)).toBe(false);
    expect(isProviderAvailable('openrouter', baseTime + 60_000)).toBe(false);
  });

  it('transitions from OPEN to HALF_OPEN when cooldown (120s) expires', () => {
    const baseTime = 1_000_000;

    for (let i = 0; i < 3; i++) {
      recordProviderFailure('groq', new Error('HTTP 429'), baseTime + i * 1000);
    }

    const openTime = baseTime + 2000;
    expect(getCircuitState('groq', openTime)).toBe('OPEN');

    // 119 seconds later -> still OPEN
    const beforeCooldown = openTime + CIRCUIT_CONFIG.COOLDOWN_MS - 1000;
    expect(getCircuitState('groq', beforeCooldown)).toBe('OPEN');
    expect(isProviderAvailable('groq', beforeCooldown)).toBe(false);

    // 120 seconds later -> HALF_OPEN (allows probe)
    const afterCooldown = openTime + CIRCUIT_CONFIG.COOLDOWN_MS;
    expect(getCircuitState('groq', afterCooldown)).toBe('HALF_OPEN');
    expect(isProviderAvailable('groq', afterCooldown)).toBe(true);
  });

  it('restores state to CLOSED and clears failures on successful probe in HALF_OPEN', () => {
    const baseTime = 1_000_000;

    for (let i = 0; i < 3; i++) {
      recordProviderFailure('gemini', new Error('HTTP 429'), baseTime + i * 1000);
    }

    const afterCooldown = baseTime + 2000 + CIRCUIT_CONFIG.COOLDOWN_MS;
    expect(getCircuitState('gemini', afterCooldown)).toBe('HALF_OPEN');

    // Probe succeeds
    recordProviderSuccess('gemini', afterCooldown + 500);

    expect(getCircuitState('gemini', afterCooldown + 500)).toBe('CLOSED');
    expect(isProviderAvailable('gemini', afterCooldown + 500)).toBe(true);

    const telemetry = getProviderTelemetry(afterCooldown + 500);
    expect(telemetry.gemini.consecutiveFailures).toBe(0);
    expect(telemetry.gemini.state).toBe('CLOSED');
  });

  it('re-trips circuit immediately to OPEN if probe fails in HALF_OPEN', () => {
    const baseTime = 1_000_000;

    for (let i = 0; i < 3; i++) {
      recordProviderFailure('gemini', new Error('HTTP 429'), baseTime + i * 1000);
    }

    const afterCooldown = baseTime + 2000 + CIRCUIT_CONFIG.COOLDOWN_MS;
    expect(getCircuitState('gemini', afterCooldown)).toBe('HALF_OPEN');

    // Probe fails
    recordProviderFailure('gemini', new Error('HTTP 429 Quota'), afterCooldown + 500);

    expect(getCircuitState('gemini', afterCooldown + 500)).toBe('OPEN');
    expect(isProviderAvailable('gemini', afterCooldown + 500)).toBe(false);
  });

  it('resets consecutive failures when a success occurs in CLOSED state', () => {
    const baseTime = 1_000_000;

    recordProviderFailure('openrouter', new Error('Transient error 1'), baseTime);
    recordProviderFailure('openrouter', new Error('Transient error 2'), baseTime + 1000);

    let telemetry = getProviderTelemetry(baseTime + 1000);
    expect(telemetry.openrouter.consecutiveFailures).toBe(2);

    recordProviderSuccess('openrouter', baseTime + 2000);

    telemetry = getProviderTelemetry(baseTime + 2000);
    expect(telemetry.openrouter.consecutiveFailures).toBe(0);
    expect(telemetry.openrouter.state).toBe('CLOSED');
  });

  it('tracks comprehensive telemetry metrics across all providers', () => {
    recordProviderSuccess('gemini');
    recordProviderFailure('openrouter', new Error('429'));

    const telemetry = getProviderTelemetry();

    expect(telemetry.gemini.totalSuccesses).toBe(1);
    expect(telemetry.gemini.totalFailures).toBe(0);
    expect(telemetry.openrouter.totalFailures).toBe(1);
    expect(telemetry.groq.state).toBe('CLOSED');
  });
});
