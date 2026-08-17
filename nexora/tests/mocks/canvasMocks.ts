import type {
  CanvasVariable,
  StemCanvasNode,
  StemCanvasEdge,
  CanvasGraph,
  CanvasSummary,
  NodeEvaluationResult,
  SuggestedBranchItem,
  SuggestedBranchResult,
  ApiResponse,
} from '@/types/canvas';

export const mockUserId = '11111111-1111-4111-a111-111111111111';
export const mockCanvasId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
export const mockTaskId = '33333333-3333-4333-a333-333333333331';

export const mockVariables: CanvasVariable[] = [
  {
    id: 'var-v0',
    name: 'v_0',
    symbol: 'v_0',
    label: 'Initial Velocity',
    value: 20,
    defaultValue: 20,
    min: 1,
    max: 100,
    step: 0.5,
    unit: 'm/s',
    description: 'Kecepatan awal proyektil',
    isIndependent: true,
  },
  {
    id: 'var-theta',
    name: 'theta',
    symbol: '\\theta',
    label: 'Launch Angle',
    value: 45,
    defaultValue: 45,
    min: 0,
    max: 90,
    step: 1,
    unit: 'deg',
    description: 'Sudut elevasi tembakan',
    isIndependent: true,
  },
  {
    id: 'var-g',
    name: 'g',
    symbol: 'g',
    label: 'Gravitational Acceleration',
    value: 9.8,
    defaultValue: 9.8,
    min: 1,
    max: 25,
    step: 0.1,
    unit: 'm/s^2',
    description: 'Percepatan gravitasi konstan',
    isIndependent: false,
  },
  {
    id: 'var-range',
    name: 'R',
    symbol: 'R',
    label: 'Maximum Range',
    value: 40.82,
    defaultValue: 40.82,
    min: 0,
    max: 1000,
    step: 0.01,
    unit: 'm',
    description: 'Jarak jangkauan maksimum horizontal',
    isIndependent: false,
  },
];

export const mockProblemRootNode: StemCanvasNode = {
  id: 'node-root-1',
  type: 'problem_root',
  position: { x: 100, y: 100 },
  data: {
    title: 'Gerak Parabola & Jangkauan Maksimum',
    nodeType: 'problem_root',
    validationStatus: 'valid',
    isCollapsed: false,
    content: 'Tentukan formula jangkauan horizontal maksimum proyektil dengan sudut elevasi theta dan kecepatan awal v_0.',
    latexFormula: 'R = \\frac{v_0^2 \\sin(2\\theta)}{g}',
    variables: mockVariables,
    customData: {
      domain: 'Kinematics',
      targetGoal: 'Buktikan R_max tercapai saat theta = 45 derajat',
    },
  },
};

export const mockReasoningStepNode: StemCanvasNode = {
  id: 'node-step-1',
  type: 'reasoning_step',
  position: { x: 450, y: 100 },
  data: {
    title: 'Dekomposisi Vektor Kecepatan',
    nodeType: 'reasoning_step',
    validationStatus: 'valid',
    isCollapsed: false,
    content: 'Komponen kecepatan pada sumbu-x konstan (GLB) dan sumbu-y mengalami percepatan gravitasi (GLBB).',
    latexFormula: 'v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt',
    variables: [mockVariables[0], mockVariables[1]],
    customData: {
      stepNumber: 1,
      appliedRule: 'Vektor Komponen Euler-Newton',
    },
  },
};

export const mockWhatIfBranchNode: StemCanvasNode = {
  id: 'node-whatif-1',
  type: 'what_if_branch',
  position: { x: 800, y: 50 },
  data: {
    title: 'Simulasi: Kecepatan Naik 50%',
    nodeType: 'what_if_branch',
    validationStatus: 'valid',
    isCollapsed: false,
    content: 'Jika kecepatan awal dinaikkan dari 20 m/s menjadi 30 m/s, jangkauan R meningkat secara kuadratik (2.25x).',
    latexFormula: 'R\' = \\frac{(1.5 v_0)^2 \\sin(2\\theta)}{g} = 2.25 R',
    variables: [
      {
        ...mockVariables[0],
        value: 30,
      },
    ],
    customData: {
      hypothesis: 'Kenaikan v_0 sebesar 50%',
      deltaPercentage: 50,
    },
  },
};

export const mockTheoremProofNode: StemCanvasNode = {
  id: 'node-theorem-1',
  type: 'theorem_proof',
  position: { x: 800, y: 250 },
  data: {
    title: 'Teorema Nilai Ekstrem Trigonometri',
    nodeType: 'theorem_proof',
    validationStatus: 'valid',
    isCollapsed: false,
    content: 'Fungsi sinus mencapai nilai maksimum 1 ketika argumen bernilai pi/2.',
    latexFormula: '\\max(\\sin(2\\theta)) = 1 \\iff 2\\theta = 90^\\circ \\iff \\theta = 45^\\circ',
    variables: [mockVariables[1]],
    customData: {
      theoremName: 'Trigonometric Maximum Condition',
      applicabilityConditions: ['0 <= theta <= 90 deg'],
    },
  },
};

export const mockFormulaBlockNode: StemCanvasNode = {
  id: 'node-formula-1',
  type: 'formula_block',
  position: { x: 1150, y: 150 },
  data: {
    title: 'Evaluasi Numerik Jangkauan',
    nodeType: 'formula_block',
    validationStatus: 'valid',
    isCollapsed: false,
    content: 'Substitusi nilai v_0 = 20 m/s, theta = 45 deg, g = 9.8 m/s^2',
    latexFormula: 'R = \\frac{20^2 \\cdot \\sin(90^\\circ)}{9.8} \\approx 40.82 \\text{ m}',
    variables: mockVariables,
  },
};

export const mockCanvasNodes: StemCanvasNode[] = [
  mockProblemRootNode,
  mockReasoningStepNode,
  mockWhatIfBranchNode,
  mockTheoremProofNode,
  mockFormulaBlockNode,
];

export const mockEdge1: StemCanvasEdge = {
  id: 'edge-1-2',
  source: 'node-root-1',
  target: 'node-step-1',
  type: 'implication',
  data: {
    edgeType: 'implication',
    label: 'Deduction step',
    justification: 'Langkah awal pembuktian proyektil',
    confidence: 0.98,
  },
};

export const mockEdge2: StemCanvasEdge = {
  id: 'edge-2-3',
  source: 'node-step-1',
  target: 'node-whatif-1',
  type: 'alternative',
  data: {
    edgeType: 'alternative',
    label: 'What-if branch',
    justification: 'Skenario simulasi variabel kecepatan',
    confidence: 0.95,
  },
};

export const mockEdge3: StemCanvasEdge = {
  id: 'edge-2-4',
  source: 'node-step-1',
  target: 'node-theorem-1',
  type: 'dependency',
  data: {
    edgeType: 'dependency',
    label: 'Axiom dependency',
    justification: 'Memerlukan syarat maksimum trigonometri',
    confidence: 0.99,
  },
};

export const mockEdge4: StemCanvasEdge = {
  id: 'edge-4-5',
  source: 'node-theorem-1',
  target: 'node-formula-1',
  type: 'implication',
  data: {
    edgeType: 'implication',
    label: 'Final evaluation',
    confidence: 1.0,
  },
};

export const mockCanvasEdges: StemCanvasEdge[] = [
  mockEdge1,
  mockEdge2,
  mockEdge3,
  mockEdge4,
];

export const mockCanvasGraph: CanvasGraph = {
  id: mockCanvasId,
  userId: mockUserId,
  taskId: mockTaskId,
  title: 'Derivasi Gerak Parabola & Jangkauan Maksimum',
  description: 'Logic tree komprehensif penurunan rumus jangkauan proyektil beserta simulasi variabel What-if.',
  category: 'Fisika & Kalkulus',
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: mockCanvasNodes,
  edges: mockCanvasEdges,
  globalVariables: mockVariables,
  isPublic: false,
  metadata: {
    difficulty: 'intermediate',
    subject: 'Physics',
  },
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:30:00.000Z',
};

export const mockCanvasSummary: CanvasSummary = {
  id: mockCanvasId,
  userId: mockUserId,
  taskId: mockTaskId,
  title: 'Derivasi Gerak Parabola & Jangkauan Maksimum',
  description: 'Logic tree komprehensif penurunan rumus jangkauan proyektil.',
  category: 'Fisika & Kalkulus',
  nodeCount: 5,
  edgeCount: 4,
  isPublic: false,
  viewport: { x: 0, y: 0, zoom: 1 },
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:30:00.000Z',
};

export const mockEvaluationValid: NodeEvaluationResult = {
  nodeId: 'node-step-1',
  isValid: true,
  validationStatus: 'valid',
  confidenceScore: 0.99,
  rationale: 'Penurunan komponen kecepatan v_x dan v_y konsisten secara matematis dan fisika.',
  stepLatex: 'v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt',
  mathematicalCheck: {
    symbolicCheckPassed: true,
    numericalEvaluation: {
      computedValue: 14.14,
      expectedValue: 14.14,
      absoluteError: 0.0,
    },
    detectedAssumptions: ['Hambatan udara diabaikan (vacuum assumption)', 'Medan gravitasi homogen'],
    suggestedCorrections: [],
  },
};

export const mockEvaluationErroneous: NodeEvaluationResult = {
  nodeId: 'node-step-1',
  isValid: false,
  validationStatus: 'erroneous',
  confidenceScore: 0.35,
  rationale: 'Terdapat kesalahan tanda pada komponen percepatan gravitasi pada sumbu-y.',
  stepLatex: 'v_y = v_0 \\sin(\\theta) + gt',
  mathematicalCheck: {
    symbolicCheckPassed: false,
    detectedAssumptions: ['Arah gravitasi berlawanan dengan sumbu y positif'],
    suggestedCorrections: ['Gunakan tanda minus: v_y = v_0 \\sin(\\theta) - gt'],
  },
};

export const mockBranchSuggestions: SuggestedBranchItem[] = [
  {
    branchType: 'what_if_simulation',
    title: 'What-If: Variasi Sudut Elevasi 30 vs 60 Derajat',
    description: 'Analisis simetri jangkauan proyektil karena sin(2*30) = sin(2*60) = sin(60) = sqrt(3)/2.',
    latexFormula: 'R(30^\\circ) = R(60^\\circ) = \\frac{\\sqrt{3} v_0^2}{2g}',
    suggestedNodeType: 'what_if_branch',
    suggestedEdgeType: 'alternative',
    positionOffset: { x: 300, y: 100 },
    variables: mockVariables,
    justification: 'Menunjukkan sifat komplemen sudut elevasi terhadap jangkauan horizontal.',
  },
  {
    branchType: 'deduction_step',
    title: 'Penurunan Waktu Capai Puncak (t_puncak)',
    description: 'Syarat puncak v_y = 0 menghasilkan t_puncak = (v_0 * sin(theta)) / g.',
    latexFormula: 't_{\\text{puncak}} = \\frac{v_0 \\sin(\\theta)}{g}',
    suggestedNodeType: 'reasoning_step',
    suggestedEdgeType: 'implication',
    positionOffset: { x: 300, y: -80 },
    variables: [mockVariables[0], mockVariables[1], mockVariables[2]],
    justification: 'Langkah esensial sebelum menghitung waktu total di udara (t_total = 2 * t_puncak).',
  },
];

export const mockSuggestedBranchResult: SuggestedBranchResult = {
  targetNodeId: 'node-step-1',
  contextSummary: 'Konteks gerak parabola 2D dianalisis dari pemisahan komponen kecepatan sumbu x dan y.',
  suggestions: mockBranchSuggestions,
};

export const mockCanvasApiResponse: ApiResponse<CanvasGraph> = {
  success: true,
  data: mockCanvasGraph,
  message: 'Canvas graph loaded successfully',
};

export const mockEvaluationApiResponse: ApiResponse<NodeEvaluationResult> = {
  success: true,
  data: mockEvaluationValid,
  message: 'Step validation completed',
};

export const mockBranchSuggestionsApiResponse: ApiResponse<{
  targetNodeId: string;
  suggestions: SuggestedBranchItem[];
}> = {
  success: true,
  data: {
    targetNodeId: 'node-step-1',
    suggestions: mockBranchSuggestions,
  },
  message: 'Branch suggestions generated successfully',
};
