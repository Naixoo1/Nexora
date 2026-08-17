import { describe, it, expect } from 'vitest';
import {
  CanvasNodeTypeSchema,
  CanvasEdgeTypeSchema,
  CreateCanvasSchema,
  UpdateCanvasSchema,
  SaveGraphSchema,
  EvaluateNodeSchema,
  SuggestBranchSchema,
  CanvasListQuerySchema,
} from '@/lib/validators/canvas';

describe('Canvas Validators', () => {
  describe('Node & Edge Types', () => {
    it('validates all 5 node types', () => {
      const validTypes = [
        'problem_root',
        'reasoning_step',
        'what_if_branch',
        'theorem_proof',
        'formula_block',
      ];
      for (const type of validTypes) {
        expect(CanvasNodeTypeSchema.parse(type)).toBe(type);
      }
      expect(() => CanvasNodeTypeSchema.parse('invalid_node')).toThrow();
    });

    it('validates all 4 edge types', () => {
      const validEdges = ['implication', 'alternative', 'dependency', 'contradiction'];
      for (const edge of validEdges) {
        expect(CanvasEdgeTypeSchema.parse(edge)).toBe(edge);
      }
      expect(() => CanvasEdgeTypeSchema.parse('invalid_edge')).toThrow();
    });
  });

  describe('CreateCanvasSchema', () => {
    it('validates minimal canvas creation', () => {
      const payload = {
        title: 'Kinematics & Projectile Motion',
      };
      const parsed = CreateCanvasSchema.parse(payload);
      expect(parsed.title).toBe('Kinematics & Projectile Motion');
    });

    it('validates canvas with initial problem root and variables', () => {
      const payload = {
        title: 'Calculus Optimization Problem',
        category: 'Calculus',
        initialProblem: {
          statement: 'Find maximum area of rectangular fence with perimeter 100m.',
          domain: 'Mathematics',
          targetGoal: 'max A(x) = x(50 - x)',
          latexFormula: 'A(x) = x \\cdot (50 - x)',
          variables: [
            {
              id: 'var-p',
              name: 'P',
              symbol: 'P',
              label: 'Perimeter',
              value: 100,
              defaultValue: 100,
              min: 10,
              max: 500,
              step: 5,
              unit: 'm',
              isIndependent: true,
            },
          ],
        },
      };
      const parsed = CreateCanvasSchema.parse(payload);
      expect(parsed.initialProblem?.variables?.[0].symbol).toBe('P');
    });
  });

  describe('SaveGraphSchema', () => {
    it('validates complete DAG graph save payload', () => {
      const payload = {
        viewport: { x: 100, y: 50, zoom: 1.2 },
        globalVariables: [
          {
            id: 'v_0',
            name: 'v_0',
            symbol: 'v_0',
            label: 'Initial Velocity',
            value: 20,
            defaultValue: 20,
            min: 0,
            max: 100,
            step: 1,
            unit: 'm/s',
            isIndependent: true,
          },
        ],
        nodes: [
          {
            id: 'node-root',
            type: 'problem_root',
            position: { x: 0, y: 0 },
            data: {
              title: 'Projectile Problem',
              nodeType: 'problem_root',
              validationStatus: 'valid',
              latexFormula: 'y(t) = v_0 t - \\frac{1}{2} g t^2',
            },
          },
          {
            id: 'node-step-1',
            type: 'reasoning_step',
            position: { x: 280, y: 0 },
            data: {
              title: 'Take derivative dy/dt',
              nodeType: 'reasoning_step',
              validationStatus: 'valid',
              latexFormula: 'v(t) = \\frac{dy}{dt} = v_0 - gt',
            },
          },
        ],
        edges: [
          {
            id: 'edge-1-2',
            source: 'node-root',
            target: 'node-step-1',
            type: 'implication',
            data: {
              edgeType: 'implication',
              label: 'Differentiation',
            },
          },
        ],
      };

      const parsed = SaveGraphSchema.parse(payload);
      expect(parsed.nodes).toHaveLength(2);
      expect(parsed.edges).toHaveLength(1);
      expect(parsed.edges[0].data?.edgeType).toBe('implication');
    });
  });

  describe('EvaluateNodeSchema & SuggestBranchSchema', () => {
    it('validates node step evaluation request', () => {
      const payload = {
        nodeId: 'node-step-1',
        currentFormula: '\\int_0^1 x^2 \\, dx = \\left[ \\frac{x^3}{3} \\right]_0^1 = \\frac{1}{3}',
        stepExplanation: 'Apply fundamental theorem of calculus with power rule.',
        contextHypotheses: ['x \\in [0, 1]'],
        variableValues: { x_max: 1 },
      };
      const parsed = EvaluateNodeSchema.parse(payload);
      expect(parsed.nodeId).toBe('node-step-1');
      expect(parsed.contextHypotheses).toHaveLength(1);
    });

    it('validates branch suggestion request', () => {
      const payload = {
        targetNodeId: 'node-root',
        branchType: 'what_if_simulation',
        simulationParameter: {
          variableId: 'v_0',
          deltaPercent: 25,
        },
      };
      const parsed = SuggestBranchSchema.parse(payload);
      expect(parsed.branchType).toBe('what_if_simulation');
      expect(parsed.simulationParameter?.deltaPercent).toBe(25);
    });
  });
});
