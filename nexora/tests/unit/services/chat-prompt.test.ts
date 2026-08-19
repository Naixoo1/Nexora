import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '@/services/chat-prompt';
import { extractCitations } from '@/services/chat';

describe('Chat Prompt & Citation Services', () => {
  describe('buildSystemPrompt', () => {
    it('builds socratic prompt by default with mathematical formatting rules', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain("Socratic Academic Tutor");
      expect(prompt).toContain("MATHEMATICAL FORMATTING RULES");
      expect(prompt).toContain("`[[node:NODE_ID|NODE_TITLE]]`");
    });

    it('injects active task and canvas context into prompt correctly', () => {
      const prompt = buildSystemPrompt({
        tutorMode: 'olympiad',
        taskContext: {
          taskId: 't-1',
          title: 'Solve IMO 2024 Problem 1',
          status: 'in_progress',
          priority: 'urgent',
          dueDate: '2026-08-30T00:00:00.000Z',
          isOverdue: false,
          subtaskCount: 4,
          completedSubtaskCount: 2,
          milestoneProgressPct: 50,
        },
        canvasContext: {
          canvasId: 'c-1',
          canvasTitle: 'IMO 2024 Algebra Graph',
          selectedNodeId: 'node-3',
          selectedNodeTitle: 'Assume x > y',
          selectedNodeFormula: 'f(x) - f(y) > 0',
          derivationPath: [
            {
              nodeId: 'node-1',
              title: 'Root Hypothesis',
              nodeType: 'problem_root',
              latexFormula: 'f: \\mathbb{R} \\to \\mathbb{R}',
            },
          ],
          activeVariables: [
            {
              id: 'var-eps',
              name: 'epsilon',
              symbol: '\\varepsilon',
              label: 'Error Bound',
              value: 0.01,
              defaultValue: 0.01,
              min: 0.001,
              max: 0.1,
              step: 0.001,
              isIndependent: true,
            },
          ],
        },
      });

      expect(prompt).toContain("Olympiad & Advanced STEM Problem-Solving Coach");
      expect(prompt).toContain("Solve IMO 2024 Problem 1");
      expect(prompt).toContain("50% milestone progress");
      expect(prompt).toContain("IMO 2024 Algebra Graph");
      expect(prompt).toContain("$f(x) - f(y) > 0$");
      expect(prompt).toContain("$\\varepsilon$");
    });
  });

  describe('extractCitations', () => {
    it('extracts node and task citations correctly', () => {
      const assistantText = `According to [[node:node-1|Initial Problem Formulation]], we know that $v_0 = 20$. Next, in [[task:task-10|Derive Acceleration Function]], the second derivative is computed.`;
      const citations = extractCitations(assistantText);

      expect(citations).toHaveLength(2);
      expect(citations[0]).toEqual({
        id: 'cite-1',
        sourceType: 'canvas_node',
        referenceId: 'node-1',
        label: 'Initial Problem Formulation',
      });
      expect(citations[1]).toEqual({
        id: 'cite-2',
        sourceType: 'task',
        referenceId: 'task-10',
        label: 'Derive Acceleration Function',
      });
    });

    it('returns empty array if no citations present', () => {
      const text = 'Here is the step by step explanation.';
      expect(extractCitations(text)).toEqual([]);
    });
  });
});
