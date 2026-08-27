import { z } from 'zod';

export const CanvasNodeTypeSchema = z.enum([
  'problem_root',
  'reasoning_step',
  'what_if_branch',
  'theorem_proof',
  'formula_block',
  'active_recall_flashcard',
  'timeline_event',
  'concept_comparison',
  'dialogue_rehearsal',
]);

export const CanvasEdgeTypeSchema = z.enum([
  'implication',
  'alternative',
  'dependency',
  'contradiction',
]);

export const NodeValidationStatusSchema = z.enum([
  'valid',
  'tentative',
  'erroneous',
]);

export const CanvasVariableSchema = z.object({
  id: z.string().default(() => `var-${Date.now()}`),
  name: z.string().min(1).max(50),
  symbol: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  value: z.number().default(0),
  defaultValue: z.number().default(0),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().positive().default(1),
  unit: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  isIndependent: z.boolean().default(true),
});

export const LatexFormulaSchema = z.object({
  expression: z.string().min(1),
  displayMode: z.enum(['inline', 'block']).default('block'),
  variables: z.record(z.string(), z.string()).optional(),
  renderedResult: z.string().optional(),
});

export const CanvasNodeInputSchema = z.object({
  id: z.string().min(1).max(100),
  type: CanvasNodeTypeSchema.optional().default('reasoning_step'),
  parentNode: z.string().max(100).nullable().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  width: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  data: z.object({
    title: z.string().min(1).max(255).default('Untitled Node'),
    nodeType: CanvasNodeTypeSchema.default('reasoning_step'),
    validationStatus: NodeValidationStatusSchema.default('tentative'),
    isCollapsed: z.boolean().optional().default(false),
    content: z.string().optional(),
    latexFormula: z.string().optional(),
    variables: z.array(CanvasVariableSchema).optional().default([]),
    customData: z.record(z.string(), z.unknown()).optional(),
  }).passthrough(),
});

export const CanvasEdgeInputSchema = z.object({
  id: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  target: z.string().min(1).max(100),
  type: CanvasEdgeTypeSchema.optional().default('implication'),
  label: z.string().max(100).optional(),
  data: z.object({
    edgeType: CanvasEdgeTypeSchema.optional().default('implication'),
    label: z.string().max(100).optional(),
    justification: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).passthrough().optional().default({ edgeType: 'implication' }),
});

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});

export const CreateCanvasSchema = z.object({
  taskId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).optional(),
  category: z.string().max(50).optional(),
  initialProblem: z
    .object({
      statement: z.string().optional(),
      domain: z.string().optional().default('Mathematics'),
      targetGoal: z.string().optional(),
      latexFormula: z.string().optional(),
      variables: z.array(CanvasVariableSchema).optional(),
    })
    .optional(),
});

export const UpdateCanvasSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).nullable().optional(),
    category: z.string().max(50).nullable().optional(),
    isPublic: z.boolean().optional(),
    viewport: ViewportSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const SaveGraphSchema = z.object({
  viewport: ViewportSchema.optional(),
  globalVariables: z.array(CanvasVariableSchema).optional().default([]),
  nodes: z.array(CanvasNodeInputSchema).default([]),
  edges: z.array(CanvasEdgeInputSchema).default([]),
});

export const EvaluateNodeSchema = z.object({
  nodeId: z.string().min(1),
  currentFormula: z.string().min(1),
  stepExplanation: z.string().optional(),
  contextHypotheses: z.array(z.string()).default([]),
  variableValues: z.record(z.string(), z.number()).default({}),
});

export const GraphContextNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  nodeType: z.string().optional(),
  content: z.string().optional(),
  latexFormula: z.string().optional(),
  variables: z.array(CanvasVariableSchema).optional(),
});

export const SuggestBranchSchema = z.object({
  targetNodeId: z.string().min(1),
  branchType: z
    .enum([
      'deduction_step',
      'what_if_simulation',
      'alternative_method',
      'counter_example',
      'all_angles',
    ])
    .optional(),
  selectedNode: GraphContextNodeSchema.optional(),
  ancestorNodes: z.array(GraphContextNodeSchema).optional(),
  problemRoot: GraphContextNodeSchema.optional(),
  targetGoal: z.string().optional(),
  recentChatContext: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .optional(),
  simulationParameter: z
    .object({
      variableId: z.string().optional(),
      deltaPercent: z.number().optional(),
    })
    .optional(),
  desiredBranchesCount: z.number().int().min(1).max(5).optional(),
  variablesContext: z.array(CanvasVariableSchema).optional(),
});

export const CanvasListQuerySchema = z.object({
  category: z.string().max(50).optional(),
  taskId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'updated_at', 'title']).default('updated_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateCanvas = z.infer<typeof CreateCanvasSchema>;
export type UpdateCanvas = z.infer<typeof UpdateCanvasSchema>;
export type SaveGraph = z.infer<typeof SaveGraphSchema>;
export type CanvasNodeInput = z.infer<typeof CanvasNodeInputSchema>;
export type CanvasEdgeInput = z.infer<typeof CanvasEdgeInputSchema>;
export type EvaluateNode = z.infer<typeof EvaluateNodeSchema>;
export type SuggestBranch = z.infer<typeof SuggestBranchSchema>;
export type CanvasListQuery = z.infer<typeof CanvasListQuerySchema>;
