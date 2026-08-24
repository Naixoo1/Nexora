import { describe, it, expect } from 'vitest';
import {
  generateDynamicSubjectFallbacks,
  suggestBranchesForNode,
} from '@/services/branch-suggester';
import { SuggestBranchSchema } from '@/lib/validators/canvas';
import type { SuggestBranch } from '@/lib/validators/canvas';

describe('Multi-Branch AI Generator & Dynamic Fallbacks', () => {
  describe('SuggestBranchSchema Validation', () => {
    it('successfully validates enriched graph lineage payload', () => {
      const validPayload: SuggestBranch = {
        targetNodeId: 'node-step-2',
        branchType: 'all_angles',
        selectedNode: {
          id: 'node-step-2',
          title: 'Suku ke-n Deret Aritmatika',
          latexFormula: 'a_n = 7 + (n-1)3',
          content: 'Menghitung suku umum dengan a_1=7 dan d=3',
        },
        problemRoot: {
          id: 'node-root-1',
          title: 'Soal Barisan Aritmatika',
          latexFormula: 'a_1 = 7, d = 3',
          content: 'Tentukan jumlah n suku pertama S_n',
        },
        targetGoal: 'Hitung nilai S_n',
        ancestorNodes: [
          {
            id: 'node-root-1',
            title: 'Problem Root',
            latexFormula: 'a_1 = 7, d = 3',
          },
          {
            id: 'node-step-1',
            title: 'Definisi Beda Barisan',
            content: 'd = a_2 - a_1 = 3',
          },
        ],
        recentChatContext: [
          { role: 'user', content: 'Bagaimana cara mencari S_n?' },
          { role: 'assistant', content: 'Gunakan rumus S_n = n/2 (2a_1 + (n-1)d).' },
        ],
        variablesContext: [
          {
            id: 'var-a1',
            name: 'a_1',
            symbol: 'a_1',
            label: 'Suku Pertama',
            value: 7,
            defaultValue: 7,
            min: 1,
            max: 100,
            step: 1,
            isIndependent: true,
          },
          {
            id: 'var-d',
            name: 'd',
            symbol: 'd',
            label: 'Beda',
            value: 3,
            defaultValue: 3,
            min: -10,
            max: 10,
            step: 1,
            isIndependent: true,
          },
        ],
        desiredBranchesCount: 3,
      };

      const result = SuggestBranchSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('accepts minimal payload with targetNodeId only', () => {
      const minimalPayload = {
        targetNodeId: 'node-123',
      };

      const result = SuggestBranchSchema.safeParse(minimalPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetNodeId).toBe('node-123');
      }
    });
  });

  describe('Dynamic Subject Fallback Generator', () => {
    it('generates exactly 3 diverse pedagogical angles', () => {
      const payload: SuggestBranch = {
        targetNodeId: 'node-test-1',
        branchType: 'all_angles',
        selectedNode: {
          id: 'node-test-1',
          title: 'Suku Pertama & Beda',
          latexFormula: 'a_1 = 7, d = 3',
        },
        problemRoot: {
          id: 'root-1',
          title: 'Deret Aritmatika',
          latexFormula: 'a_1 = 7, d = 3',
        },
      };

      const result = generateDynamicSubjectFallbacks(payload, 'Suku Pertama & Beda', 'a_1 = 7, d = 3');

      expect(result.suggestions).toHaveLength(3);

      const [angle1, angle2, angle3] = result.suggestions;

      // Angle 1: Alternative Method
      expect(angle1.angleType).toBe('alternative_method');
      expect(angle1.branchType).toBe('alternative_method');
      expect(angle1.suggestedEdgeType).toBe('alternative');
      expect(angle1.latexFormula).toContain('S_n');
      expect(angle1.justification).toBeTruthy();

      // Angle 2: Next Logical Progression
      expect(angle2.angleType).toBe('next_progression');
      expect(angle2.branchType).toBe('deduction_step');
      expect(angle2.suggestedEdgeType).toBe('implication');
      expect(angle2.latexFormula).toContain('3n + 11');

      // Angle 3: What-If Exploration
      expect(angle3.angleType).toBe('what_if_exploration');
      expect(angle3.branchType).toBe('what_if_simulation');
      expect(angle3.suggestedNodeType).toBe('what_if_branch');
      expect(angle3.latexFormula).toContain('-3');
    });

    it('extracts variable values from variablesContext array when provided', () => {
      const payload: SuggestBranch = {
        targetNodeId: 'node-test-2',
        branchType: 'all_angles',
        variablesContext: [
          {
            id: 'v1',
            name: 'a_1',
            symbol: 'a_1',
            label: 'Initial',
            value: 12,
            defaultValue: 12,
            min: 1,
            max: 50,
            step: 1,
            isIndependent: true,
          },
          {
            id: 'v2',
            name: 'd',
            symbol: 'd',
            label: 'Diff',
            value: 5,
            defaultValue: 5,
            min: 1,
            max: 20,
            step: 1,
            isIndependent: true,
          },
        ],
      };

      const result = generateDynamicSubjectFallbacks(payload);
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[1].latexFormula).toContain('12');
      expect(result.suggestions[1].latexFormula).toContain('5');
    });
  });

  describe('suggestBranchesForNode Service', () => {
    it('seamlessly falls back to dynamic 3-angle generator when API key is not configured', async () => {
      const originalEnv = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = '';

      try {
        const payload: SuggestBranch = {
          targetNodeId: 'node-fallback-test',
          branchType: 'all_angles',
          selectedNode: {
            id: 'node-fallback-test',
            title: 'Langkah Aritmatika',
            latexFormula: 'a_1 = 7, d = 3',
          },
        };

        const result = await suggestBranchesForNode(payload);

        expect(result.targetNodeId).toBe('node-fallback-test');
        expect(result.suggestions).toHaveLength(3);
        expect(result.suggestions[0].angleType).toBe('alternative_method');
        expect(result.suggestions[1].angleType).toBe('next_progression');
        expect(result.suggestions[2].angleType).toBe('what_if_exploration');
      } finally {
        process.env.GEMINI_API_KEY = originalEnv;
      }
    });
  });
});
