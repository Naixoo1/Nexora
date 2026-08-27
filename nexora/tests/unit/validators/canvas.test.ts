import { describe, it, expect } from 'vitest';
import {
  CanvasNodeTypeSchema,
  CanvasEdgeTypeSchema,
  NodeValidationStatusSchema,
  CanvasVariableSchema,
  LatexFormulaSchema,
  CanvasNodeInputSchema,
  CanvasEdgeInputSchema,
  ViewportSchema,
  CreateCanvasSchema,
  UpdateCanvasSchema,
  SaveGraphSchema,
  EvaluateNodeSchema,
  SuggestBranchSchema,
  CanvasListQuerySchema,
} from '@/lib/validators/canvas';

describe('Canvas Validators', () => {
  describe('Enum Schemas', () => {
    it('should validate all valid CanvasNodeType enum members when provided', () => {
      // Arrange
      const validTypes = [
        'problem_root',
        'reasoning_step',
        'what_if_branch',
        'theorem_proof',
        'formula_block',
      ];

      // Act & Assert
      validTypes.forEach((nodeType) => {
        const result = CanvasNodeTypeSchema.safeParse(nodeType);
        expect(result.success).toBe(true);
      });
    });

    it('should fail validation when invalid CanvasNodeType is given', () => {
      // Arrange
      const invalidType = 'decision_gate';

      // Act
      const result = CanvasNodeTypeSchema.safeParse(invalidType);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate all valid CanvasEdgeType enum members when provided', () => {
      // Arrange
      const validEdgeTypes = ['implication', 'alternative', 'dependency', 'contradiction'];

      // Act & Assert
      validEdgeTypes.forEach((edgeType) => {
        const result = CanvasEdgeTypeSchema.safeParse(edgeType);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all valid NodeValidationStatus enum members when provided', () => {
      // Arrange
      const validStatuses = ['valid', 'tentative', 'erroneous'];

      // Act & Assert
      validStatuses.forEach((status) => {
        const result = NodeValidationStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('CanvasVariableSchema', () => {
    it('should validate a complete variable object with all properties and defaults', () => {
      // Arrange
      const variablePayload = {
        id: 'var-1',
        name: 'v_0',
        symbol: 'v_0',
        label: 'Initial Velocity',
        value: 25,
        defaultValue: 20,
        min: 0,
        max: 100,
        step: 0.5,
        unit: 'm/s',
        description: 'Initial launch speed',
      };

      // Act
      const result = CanvasVariableSchema.safeParse(variablePayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isIndependent).toBe(true); // Default value
        expect(result.data.step).toBe(0.5);
      }
    });

    it('should fail validation when step is zero or negative', () => {
      // Arrange
      const invalidVariable = {
        id: 'var-1',
        name: 'v_0',
        symbol: 'v_0',
        label: 'Initial Velocity',
        value: 20,
        defaultValue: 20,
        min: 0,
        max: 100,
        step: -1, // Invalid non-positive step
      };

      // Act
      const result = CanvasVariableSchema.safeParse(invalidVariable);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when variable name or symbol is empty', () => {
      // Arrange
      const invalidVariable = {
        id: 'var-1',
        name: '',
        symbol: '',
        label: 'Empty Symbol',
        value: 10,
        defaultValue: 10,
        min: 0,
        max: 50,
        step: 1,
      };

      // Act
      const result = CanvasVariableSchema.safeParse(invalidVariable);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('LatexFormulaSchema', () => {
    it('should validate a valid LaTeX formula and default displayMode to block', () => {
      // Arrange
      const payload = {
        expression: 'E = mc^2',
      };

      // Act
      const result = LatexFormulaSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expression).toBe('E = mc^2');
        expect(result.data.displayMode).toBe('block');
      }
    });

    it('should validate formula with explicit inline displayMode and token variable mappings', () => {
      // Arrange
      const payload = {
        expression: '\\frac{v_0^2 \\sin(2\\theta)}{g}',
        displayMode: 'inline' as const,
        variables: { v_0: 'var-v0', theta: 'var-theta' },
        renderedResult: '40.82 m',
      };

      // Act
      const result = LatexFormulaSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayMode).toBe('inline');
        expect(result.data.variables?.v_0).toBe('var-v0');
      }
    });

    it('should fail validation when expression is empty string', () => {
      // Arrange
      const payload = {
        expression: '',
      };

      // Act
      const result = LatexFormulaSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('CanvasNodeInputSchema & CanvasEdgeInputSchema', () => {
    it('should validate CanvasNodeInputSchema and apply default node properties', () => {
      // Arrange
      const nodeInput = {
        id: 'node-1',
        position: { x: 150, y: 250 },
        data: {
          title: 'Derivation Step 1',
        },
      };

      // Act
      const result = CanvasNodeInputSchema.safeParse(nodeInput);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('reasoning_step');
        expect(result.data.data.nodeType).toBe('reasoning_step');
        expect(result.data.data.validationStatus).toBe('tentative');
        expect(result.data.data.isCollapsed).toBe(false);
        expect(result.data.data.variables).toEqual([]);
      }
    });

    it('should fail CanvasNodeInputSchema when position coordinates are missing', () => {
      // Arrange
      const invalidNode = {
        id: 'node-1',
        data: {
          title: 'Missing Position Node',
        },
      };

      // Act
      const result = CanvasNodeInputSchema.safeParse(invalidNode);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate CanvasEdgeInputSchema and default edgeType and data structure', () => {
      // Arrange
      const edgeInput = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      };

      // Act
      const result = CanvasEdgeInputSchema.safeParse(edgeInput);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('implication');
        expect(result.data.data?.edgeType).toBe('implication');
      }
    });

    it('should fail CanvasEdgeInputSchema when confidence is outside 0-1 range', () => {
      // Arrange
      const invalidEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        data: {
          confidence: 1.5, // Exceeds max 1
        },
      };

      // Act
      const result = CanvasEdgeInputSchema.safeParse(invalidEdge);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('ViewportSchema', () => {
    it('should validate valid viewport with positive zoom', () => {
      // Arrange
      const viewport = { x: 100, y: -50, zoom: 1.25 };

      // Act
      const result = ViewportSchema.safeParse(viewport);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should fail viewport validation when zoom is zero or negative', () => {
      // Arrange
      const invalidViewport = { x: 0, y: 0, zoom: -0.5 };

      // Act
      const result = ViewportSchema.safeParse(invalidViewport);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('CreateCanvasSchema & UpdateCanvasSchema', () => {
    it('should validate CreateCanvasSchema with valid title and optional initial problem', () => {
      // Arrange
      const payload = {
        taskId: '11111111-1111-4111-a111-111111111111',
        title: 'Gerak Parabola & Persamaan Bernoulli',
        description: 'Eksplorasi konsep mekanika fluida',
        category: 'Fisika',
        initialProblem: {
          statement: 'Buktikan kontinuitas aliran fluida',
          domain: 'Fluid Dynamics',
          targetGoal: 'A_1 v_1 = A_2 v_2',
        },
      };

      // Act
      const result = CreateCanvasSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Gerak Parabola & Persamaan Bernoulli');
      }
    });

    it('should validate CreateCanvasSchema with optional fields omitted or valid', () => {
      // Arrange
      const payload = {
        title: 'Kalkulus Lanjut',
        description: 'Pembahasan integral lipat',
        category: 'Kalkulus',
        initialProblem: {
          statement: 'Hitung volume benda putar',
          domain: 'Mathematics',
          latexFormula: 'V = \\pi \\int_a^b [f(x)]^2 dx',
        },
      };

      // Act
      const result = CreateCanvasSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Kalkulus Lanjut');
        expect(result.data.description).toBe('Pembahasan integral lipat');
        expect(result.data.initialProblem?.statement).toBe('Hitung volume benda putar');
        expect(result.data.initialProblem?.latexFormula).toBe('V = \\pi \\int_a^b [f(x)]^2 dx');
      }
    });

    it('should fail CreateCanvasSchema when title is empty', () => {
      // Arrange
      const payload = {
        title: '',
      };

      // Act
      const result = CreateCanvasSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate UpdateCanvasSchema with partial fields and nullable descriptions', () => {
      // Arrange
      const payload = {
        title: 'Updated Canvas Title',
        description: null,
        isPublic: true,
      };

      // Act
      const result = UpdateCanvasSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
        expect(result.data.isPublic).toBe(true);
      }
    });

    it('should fail UpdateCanvasSchema when empty object is submitted', () => {
      // Arrange
      const emptyPayload = {};

      // Act
      const result = UpdateCanvasSchema.safeParse(emptyPayload);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'At least one field must be provided for update'
        );
      }
    });
  });

  describe('SaveGraphSchema', () => {
    it('should validate complete graph state with nodes, edges, viewport, and variables', () => {
      // Arrange
      const savePayload = {
        viewport: { x: 50, y: 100, zoom: 0.8 },
        globalVariables: [
          {
            id: 'var-1',
            name: 'm',
            symbol: 'm',
            label: 'Mass',
            value: 5,
            defaultValue: 5,
            min: 0.1,
            max: 50,
            step: 0.1,
          },
        ],
        nodes: [
          {
            id: 'n1',
            position: { x: 0, y: 0 },
            data: { title: 'Node 1' },
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'n1',
            target: 'n2',
          },
        ],
      };

      // Act
      const result = SaveGraphSchema.safeParse(savePayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes).toHaveLength(1);
        expect(result.data.edges).toHaveLength(1);
        expect(result.data.globalVariables).toHaveLength(1);
      }
    });

    it('should apply empty array defaults when nodes, edges, and variables are omitted', () => {
      // Arrange
      const minimalPayload = {};

      // Act
      const result = SaveGraphSchema.safeParse(minimalPayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes).toEqual([]);
        expect(result.data.edges).toEqual([]);
        expect(result.data.globalVariables).toEqual([]);
      }
    });
  });

  describe('EvaluateNodeSchema & SuggestBranchSchema', () => {
    it('should validate EvaluateNodeSchema when nodeId and formula are provided', () => {
      // Arrange
      const payload = {
        nodeId: 'node-step-1',
        currentFormula: '\\int x e^x dx = x e^x - e^x + C',
        stepExplanation: 'Integration by parts with u = x and dv = e^x dx',
        contextHypotheses: ['x in Real'],
        variableValues: { x: 2 },
      };

      // Act
      const result = EvaluateNodeSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodeId).toBe('node-step-1');
        expect(result.data.contextHypotheses).toEqual(['x in Real']);
      }
    });

    it('should fail EvaluateNodeSchema when currentFormula is empty', () => {
      // Arrange
      const payload = {
        nodeId: 'node-step-1',
        currentFormula: '',
      };

      // Act
      const result = EvaluateNodeSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate SuggestBranchSchema with branchType and optional simulation parameters', () => {
      // Arrange
      const payload = {
        targetNodeId: 'node-step-1',
        branchType: 'what_if_simulation' as const,
        simulationParameter: {
          variableId: 'var-v0',
          deltaPercent: 50,
        },
      };

      // Act
      const result = SuggestBranchSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.branchType).toBe('what_if_simulation');
        expect(result.data.simulationParameter?.deltaPercent).toBe(50);
      }
    });

    it('should fail SuggestBranchSchema when invalid branchType is given', () => {
      // Arrange
      const payload = {
        targetNodeId: 'node-step-1',
        branchType: 'invalid_branch_type',
      };

      // Act
      const result = SuggestBranchSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('CanvasListQuerySchema', () => {
    it('should apply defaults and coerce string page/limit when valid string query parameters are passed', () => {
      // Arrange
      const queryParams = {
        page: '3',
        limit: '15',
        sortBy: 'title',
        sortDir: 'asc',
        search: 'Kalkulus',
      };

      // Act
      const result = CanvasListQuerySchema.safeParse(queryParams);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(15);
        expect(result.data.sortBy).toBe('title');
        expect(result.data.sortDir).toBe('asc');
        expect(result.data.search).toBe('Kalkulus');
      }
    });

    it('should fallback to default page=1, limit=20, sortBy=updated_at, sortDir=desc when empty query is provided', () => {
      // Arrange
      const emptyParams = {};

      // Act
      const result = CanvasListQuerySchema.safeParse(emptyParams);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('updated_at');
        expect(result.data.sortDir).toBe('desc');
      }
    });

    it('should fail CanvasListQuerySchema when limit exceeds 100', () => {
      // Arrange
      const invalidParams = {
        limit: '200',
      };

      // Act
      const result = CanvasListQuerySchema.safeParse(invalidParams);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
