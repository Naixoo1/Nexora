import { describe, it, expect } from 'vitest';
import {
  classifyPromptComplexity,
  getComplexityConfig,
  DERIVATION_KEYWORDS,
} from '@/services/ai-classifier';

describe('Prompt Complexity Classifier & Dynamic Parameters', () => {
  describe('classifyPromptComplexity', () => {
    it('should classify short questions with no derivation keywords as "fast"', () => {
      expect(classifyPromptComplexity('What is the capital of France?')).toBe('fast');
      expect(classifyPromptComplexity('Define osmosis briefly.')).toBe('fast');
      expect(classifyPromptComplexity('What time is the class tomorrow?')).toBe('fast');
    });

    it('should classify medium questions (25-60 words) as "balanced"', () => {
      const mediumPrompt =
        'I am studying organic chemistry for my upcoming college exam. Can you give me a summary of aldehyde reactions and how they differ from ketones in nucleophilic addition?';
      const words = mediumPrompt.split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(25);
      expect(words).toBeLessThanOrEqual(60);

      expect(classifyPromptComplexity(mediumPrompt)).toBe('balanced');
    });

    it('should classify prompts containing derivation / proof keywords as "deep"', () => {
      expect(classifyPromptComplexity('Prove that the square root of 2 is irrational.')).toBe('deep');
      expect(classifyPromptComplexity('Derive the Euler-Lagrange equations from the principle of least action.')).toBe('deep');
      expect(classifyPromptComplexity('Give me a step-by-step mathematical breakdown of this integral.')).toBe('deep');
      expect(classifyPromptComplexity('Explain in detail how backpropagation works in transformers.')).toBe('deep');
      expect(classifyPromptComplexity('Solve this differential equation: y\'\' + 4y = 0.')).toBe('deep');
      expect(classifyPromptComplexity('Write python code to implement a DAG topology sorter.')).toBe('deep');
    });

    it('should classify very long prompts (> 60 words) as "deep"', () => {
      const longPrompt = Array(65).fill('context').join(' ');
      expect(classifyPromptComplexity(longPrompt)).toBe('deep');
    });

    it('should handle edge cases like empty strings and whitespace cleanly', () => {
      expect(classifyPromptComplexity('')).toBe('fast');
      expect(classifyPromptComplexity('   ')).toBe('fast');
    });
  });

  describe('getComplexityConfig', () => {
    it('should return 0 thinking budget and fast parameters for "fast" tier', () => {
      const config = getComplexityConfig('What is gravity?');
      expect(config.tier).toBe('fast');
      expect(config.maxOutputTokens).toBe(512);
      expect(config.temperature).toBe(0.2);
      expect(config.thinkingBudget).toBe(0);
      expect(config.statusLabel).toBe('Synthesizing quick insight...');
    });

    it('should return balanced parameters for "balanced" tier', () => {
      const mediumPrompt =
        'Can you summarize the primary historical and cultural factors that led to the Renaissance in Western Europe, focusing particularly on Mediterranean trade networks, universities, and the rediscovery of classical Greek texts?';
      const words = mediumPrompt.split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(25);
      expect(words).toBeLessThanOrEqual(60);

      const config = getComplexityConfig(mediumPrompt);
      expect(config.tier).toBe('balanced');
      expect(config.maxOutputTokens).toBe(1200);
      expect(config.temperature).toBe(0.5);
      expect(config.thinkingBudget).toBe(512);
      expect(config.statusLabel).toBe('Structuring response & key concepts...');
    });

    it('should return deep reasoning parameters and full thinking budget for "deep" tier', () => {
      const config = getComplexityConfig('Derive the Maxwell stress tensor from Lorentz force law.');
      expect(config.tier).toBe('deep');
      expect(config.maxOutputTokens).toBe(3000);
      expect(config.temperature).toBe(0.6);
      expect(config.thinkingBudget).toBe(2048);
      expect(config.statusLabel).toBe('Deconstructing derivation & reasoning step-by-step...');
    });
  });

  describe('Derivation Keywords', () => {
    it('should include all essential STEM and math solver triggers', () => {
      expect(DERIVATION_KEYWORDS).toContain('prove');
      expect(DERIVATION_KEYWORDS).toContain('derive');
      expect(DERIVATION_KEYWORDS).toContain('step-by-step');
      expect(DERIVATION_KEYWORDS).toContain('solve');
      expect(DERIVATION_KEYWORDS).toContain('theorem');
      expect(DERIVATION_KEYWORDS).toContain('integral');
      expect(DERIVATION_KEYWORDS).toContain('code');
    });
  });
});
