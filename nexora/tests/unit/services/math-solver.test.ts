import { describe, it, expect } from 'vitest';
import { evaluateNodeDerivation, suggestBranchesForNode } from '@/services/math-solver';

describe('Math Solver Service', () => {
  describe('evaluateNodeDerivation', () => {
    it('evaluates derivation step correctly under fallback/offline mode', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await evaluateNodeDerivation({
        nodeId: 'node-test-1',
        currentFormula: 'E = mc^2',
        stepExplanation: 'Relativistic energy-momentum relation at zero momentum.',
        contextHypotheses: ['p = 0'],
        variableValues: { c: 299792458 },
      });

      expect(result.nodeId).toBe('node-test-1');
      expect(result.isValid).toBe(true);
      expect(result.validationStatus).toBe('valid');
      expect(result.stepLatex).toBe('E = mc^2');
      expect(result.mathematicalCheck.symbolicCheckPassed).toBe(true);

      process.env.GEMINI_API_KEY = originalKey;
    });

    it('flags invalid or empty formula appropriately', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await evaluateNodeDerivation({
        nodeId: 'node-test-err',
        currentFormula: 'undefined + error',
        contextHypotheses: [],
        variableValues: {},
      });

      expect(result.isValid).toBe(false);
      expect(result.validationStatus).toBe('erroneous');

      process.env.GEMINI_API_KEY = originalKey;
    });
  });

  describe('suggestBranchesForNode', () => {
    it('generates what-if simulation branches with parameter perturbation', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await suggestBranchesForNode(
        {
          targetNodeId: 'node-root-1',
          branchType: 'what_if_simulation',
          simulationParameter: {
            variableId: 'k',
            deltaPercent: 50,
          },
        },
        'Harmonic Oscillator',
        '\\omega = \\sqrt{\\frac{k}{m}}'
      );

      expect(result.targetNodeId).toBe('node-root-1');
      expect(result.suggestions).toHaveLength(1);

      const firstSuggestion = result.suggestions[0];
      expect(firstSuggestion.branchType).toBe('what_if_simulation');
      expect(firstSuggestion.suggestedNodeType).toBe('what_if_branch');
      expect(firstSuggestion.positionOffset).toHaveProperty('x');
      expect(firstSuggestion.positionOffset).toHaveProperty('y');

      process.env.GEMINI_API_KEY = originalKey;
    });

    it('generates alternative method branches', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await suggestBranchesForNode(
        {
          targetNodeId: 'node-root-2',
          branchType: 'alternative_method',
        },
        'Differential Equation',
        'y\'\' + y = 0'
      );

      expect(result.suggestions[0].branchType).toBe('alternative_method');
      expect(result.suggestions[0].suggestedEdgeType).toBe('alternative');

      process.env.GEMINI_API_KEY = originalKey;
    });

    it('generates counter-example / singularity boundary branches', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await suggestBranchesForNode(
        {
          targetNodeId: 'node-root-3',
          branchType: 'counter_example',
        },
        'Limit Evaluation',
        '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1'
      );

      expect(result.suggestions[0].branchType).toBe('counter_example');
      expect(result.suggestions[0].suggestedEdgeType).toBe('contradiction');

      process.env.GEMINI_API_KEY = originalKey;
    });
  });
});
