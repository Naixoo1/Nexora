import type { NodeToTaskConvert, CanvasTasksQuery } from '@/lib/validators/canvas-task';
import type { TaskSelect } from '@/db/schema/tasks';
import type { ApiResponse } from '@/types/canvas';

export const mockUserId = '11111111-1111-4111-a111-111111111111';
export const mockCanvasId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
export const mockNodeId = 'node-step-1';
export const mockParentTaskId = '33333333-3333-4333-a333-333333333331';
export const mockCreatedTaskId = '99999999-9999-4999-a999-999999999999';

export const mockDbCanvas = {
  id: mockCanvasId,
  userId: mockUserId,
  taskId: mockParentTaskId,
  title: 'Derivasi Gerak Parabola & Jangkauan Maksimum',
  description: 'Logic tree penurunan rumus jangkauan proyektil.',
  category: 'Fisika Klasik',
  viewport: { x: 0, y: 0, zoom: 1 },
  globalVariables: [],
  isPublic: false,
  metadata: {},
  createdAt: new Date('2026-08-19T10:00:00.000Z'),
  updatedAt: new Date('2026-08-19T10:30:00.000Z'),
};

export const mockDbNode = {
  id: mockNodeId,
  canvasId: mockCanvasId,
  parentNodeId: null,
  nodeType: 'reasoning_step',
  title: 'Dekomposisi Vektor Kecepatan',
  content: 'Komponen kecepatan pada sumbu-x konstan (GLB) dan sumbu-y mengalami percepatan gravitasi (GLBB).',
  latexFormula: 'v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt',
  positionX: 450,
  positionY: 100,
  width: 320,
  height: 200,
  validationStatus: 'valid',
  isCollapsed: false,
  variables: [
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
      isIndependent: true,
    },
  ],
  customData: { appliedRule: 'Vektor Komponen Euler-Newton' },
  sortOrder: 1,
  createdAt: new Date('2026-08-19T10:00:00.000Z'),
  updatedAt: new Date('2026-08-19T10:30:00.000Z'),
};

export const mockNodeToTaskPayload: NodeToTaskConvert = {
  priority: 'high',
  includeVariablesInDescription: true,
  includeLatexInDescription: true,
};

export const mockCustomNodeToTaskPayload: NodeToTaskConvert = {
  title: 'Tugas Mandiri: Verifikasi Eksperimen Komponen Kecepatan',
  description: 'Lakukan simulasi numerik di lab untuk memverifikasi vektor kecepatan.',
  priority: 'urgent',
  category: 'Praktikum Fisika',
  dueDate: '2026-09-15T12:00:00.000Z',
  parentTaskId: mockParentTaskId,
  includeVariablesInDescription: false,
  includeLatexInDescription: false,
};

export const mockConvertedTask: TaskSelect = {
  id: mockCreatedTaskId,
  userId: mockUserId,
  parentId: null,
  title: '[Derivation Step] Dekomposisi Vektor Kecepatan',
  description: `Komponen kecepatan pada sumbu-x konstan (GLB) dan sumbu-y mengalami percepatan gravitasi (GLBB).\n\n### Mathematical Formulation\n$$\nv_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt\n$$\n\n### Active Parameters\n- **$v_0$** (Initial Velocity): 20 m/s (Range: [1, 100], Step: 0.5)\n- **$\\theta$** (Launch Angle): 45 deg (Range: [0, 90], Step: 1)\n\n*Exported from STEM Canvas: **"Derivasi Gerak Parabola & Jangkauan Maksimum"** (Node: \`node-step-1\`)*`,
  status: 'todo',
  priority: 'high',
  category: 'Fisika Klasik',
  dueDate: null,
  completedAt: null,
  source: 'canvas_export',
  aiSessionId: null,
  canvasNodeId: mockNodeId,
  nodeX: 450,
  nodeY: 100,
  latexFormula: 'v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt',
  sortOrder: 0,
  createdAt: new Date('2026-08-19T11:00:00.000Z'),
  updatedAt: new Date('2026-08-19T11:00:00.000Z'),
};

export const mockLinkedTasksList: (TaskSelect & { canvasNodeTitle?: string })[] = [
  {
    ...mockConvertedTask,
    canvasNodeTitle: 'Dekomposisi Vektor Kecepatan',
  },
];

export const mockCanvasTasksQuery: CanvasTasksQuery = {
  status: 'todo',
  priority: 'high',
  page: 1,
  limit: 20,
};

export const mockCanvasTasksListApiResponse: ApiResponse<{
  items: { id: string; canvasNodeId?: string | null }[];
}> = {
  success: true,
  data: {
    items: [
      {
        id: mockCreatedTaskId,
        canvasNodeId: mockNodeId,
      },
    ],
  },
  message: 'Canvas linked tasks loaded successfully',
};

export const mockConvertNodeToTaskApiResponse: ApiResponse<TaskSelect> = {
  success: true,
  data: mockConvertedTask,
  message: 'Canvas node converted to task successfully',
};
