/**
 * Prompt Complexity Classifier & Dynamic Generation Parameters.
 * Dynamically routes prompt complexity into latency and reasoning tiers (Fast, Balanced, Deep).
 */

export type PromptComplexityTier = 'fast' | 'balanced' | 'deep';

export interface ComplexityConfig {
  tier: PromptComplexityTier;
  maxOutputTokens: number;
  temperature: number;
  thinkingBudget: number; // 0 disables thinking delay on Gemini 2.5 Flash for sub-second responses
  statusLabel: string;
}

export const DERIVATION_KEYWORDS = [
  'prove',
  'proof',
  'derive',
  'derivation',
  'step-by-step',
  'step by step',
  'explain in detail',
  'in detail',
  'solve',
  'solution',
  'code',
  'theorem',
  'integral',
  'derivative',
  'algorithm',
  'formula',
  'latex',
  'expand',
  'calculate',
  'equation',
  'proof tree',
  'invariant',
] as const;

const DERIVATION_REGEX = new RegExp(
  `\\b(${DERIVATION_KEYWORDS.map((k) => k.replace(/[-\s]/g, '[-\\s]')).join('|')})\\b`,
  'i'
);

/**
 * Classifies prompt into 'fast' | 'balanced' | 'deep' complexity tier.
 * - 'fast': < 25 words with no derivation keywords
 * - 'balanced': 25–60 words with standard factual / academic questions
 * - 'deep': > 60 words OR matching keywords: prove, derive, step-by-step, explain in detail, solve, code, theorem
 */
export function classifyPromptComplexity(prompt: string): PromptComplexityTier {
  if (!prompt || typeof prompt !== 'string') return 'fast';

  const trimmed = prompt.trim();
  if (!trimmed) return 'fast';

  // Count words
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const hasDerivationKeyword = DERIVATION_REGEX.test(trimmed);

  // 1. Deep Tier: Long prompts (> 60 words) OR contains explicit derivation/proof/coding keywords
  if (wordCount > 60 || hasDerivationKeyword) {
    return 'deep';
  }

  // 2. Balanced Tier: Medium prompts (25 - 60 words)
  if (wordCount >= 25) {
    return 'balanced';
  }

  // 3. Fast Tier: Short prompts (< 25 words) with no derivation keywords
  return 'fast';
}

/**
 * Returns dynamic generation parameters based on classified prompt complexity.
 */
export function getComplexityConfig(prompt: string): ComplexityConfig {
  const tier = classifyPromptComplexity(prompt);

  switch (tier) {
    case 'fast':
      return {
        tier: 'fast',
        maxOutputTokens: 512,
        temperature: 0.2,
        thinkingBudget: 0,
        statusLabel: 'Synthesizing quick insight...',
      };

    case 'balanced':
      return {
        tier: 'balanced',
        maxOutputTokens: 1200,
        temperature: 0.5,
        thinkingBudget: 512,
        statusLabel: 'Structuring response & key concepts...',
      };

    case 'deep':
      return {
        tier: 'deep',
        maxOutputTokens: 3000,
        temperature: 0.6,
        thinkingBudget: 2048,
        statusLabel: 'Deconstructing derivation & reasoning step-by-step...',
      };
  }
}
