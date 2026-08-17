import type {
  Task,
  ProgressSnapshot,
  ProgressTarget,
  ApiResponse,
  PaginatedResponse,
} from '@/types/task';

export const mockUserId = '11111111-1111-4111-a111-111111111111';
export const mockAiSessionId = '22222222-2222-4222-a222-222222222222';

export const mockTask1: Task = {
  id: '33333333-3333-4333-a333-333333333331',
  userId: mockUserId,
  parentId: null,
  title: 'Belajar Kalkulus Dasar',
  description: 'Memahami konsep limit dan turunan',
  status: 'todo',
  priority: 'high',
  category: 'Matematika',
  dueDate: '2026-08-25T10:00:00.000Z',
  completedAt: null,
  source: 'manual',
  aiSessionId: null,
  sortOrder: 0,
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:00:00.000Z',
};

export const mockTask2Subtask1: Task = {
  id: '33333333-3333-4333-a333-333333333332',
  userId: mockUserId,
  parentId: '33333333-3333-4333-a333-333333333331',
  title: 'Latihan Soal Limit Fungsi Aljabar',
  description: 'Kerjakan soal 1-10 dari buku teks',
  status: 'in_progress',
  priority: 'medium',
  category: 'Matematika',
  dueDate: '2026-08-20T10:00:00.000Z',
  completedAt: null,
  source: 'manual',
  aiSessionId: null,
  sortOrder: 0,
  createdAt: '2026-08-17T12:05:00.000Z',
  updatedAt: '2026-08-17T12:05:00.000Z',
};

export const mockTask3SubSubtask1: Task = {
  id: '33333333-3333-4333-a333-333333333333',
  userId: mockUserId,
  parentId: '33333333-3333-4333-a333-333333333332',
  title: 'Sub-subtask: Bentuk Tak Tentu 0/0',
  description: 'Metode faktorisasi dan dalil L Hopital',
  status: 'completed',
  priority: 'urgent',
  category: 'Matematika',
  dueDate: '2026-08-18T10:00:00.000Z',
  completedAt: '2026-08-17T15:00:00.000Z',
  source: 'ai_planner',
  aiSessionId: mockAiSessionId,
  sortOrder: 0,
  createdAt: '2026-08-17T12:10:00.000Z',
  updatedAt: '2026-08-17T15:00:00.000Z',
};

export const mockTask4ExceedingDepth: Task = {
  id: '33333333-3333-4333-a333-333333333334',
  userId: mockUserId,
  parentId: '33333333-3333-4333-a333-333333333333', // level 3 parent -> child would be level 4 (exceeding MAX_ALLOWED_DEPTH = 3)
  title: 'Deep Nested Subtask (Exceeding limit)',
  description: 'Should fallback to root level',
  status: 'todo',
  priority: 'low',
  category: 'Matematika',
  dueDate: null,
  completedAt: null,
  source: 'manual',
  aiSessionId: null,
  sortOrder: 1,
  createdAt: '2026-08-17T12:15:00.000Z',
  updatedAt: '2026-08-17T12:15:00.000Z',
};

export const mockFlatTasks: Task[] = [
  mockTask1,
  mockTask2Subtask1,
  mockTask3SubSubtask1,
];

export const mockTaskListResponse: ApiResponse<PaginatedResponse<Task>> = {
  success: true,
  data: {
    items: mockFlatTasks,
    total: 3,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  message: 'Tasks retrieved successfully',
};

export const mockCreateTaskResponse: ApiResponse<Task> = {
  success: true,
  data: mockTask1,
  message: 'Task created successfully',
};

export const mockUpdateTaskResponse: ApiResponse<Task> = {
  success: true,
  data: {
    ...mockTask1,
    title: 'Updated Task Title',
    status: 'in_progress',
    updatedAt: '2026-08-17T13:00:00.000Z',
  },
  message: 'Task updated successfully',
};

export const mockDeleteTaskResponse: ApiResponse<Task> = {
  success: true,
  data: mockTask1,
  message: 'Task deleted successfully',
};

export const mockProgressTargets: ProgressTarget[] = [
  { label: 'Eksplorasi literatur & studi pustaka terdahulu', completed: true },
  { label: 'Formulasi hipotesis & rancangan metodologi', completed: true },
  { label: 'Ekstraksi logic tree penurunan rumus', completed: false },
  { label: 'Validasi & simulasi skenario What-if', completed: false },
];

export const mockProgressSnapshot: ProgressSnapshot = {
  id: '44444444-4444-4444-a444-444444444441',
  taskId: mockTask1.id,
  userId: mockUserId,
  aiSessionId: mockAiSessionId,
  totalSteps: 4,
  completedSteps: 2,
  targets: mockProgressTargets,
  status: 'active',
  startedAt: '2026-08-17T10:00:00.000Z',
  endedAt: null,
  createdAt: '2026-08-17T10:00:00.000Z',
  updatedAt: '2026-08-17T10:30:00.000Z',
};

export const mockProgressApiResponse: ApiResponse<ProgressSnapshot> = {
  success: true,
  data: mockProgressSnapshot,
  message: 'Progress snapshot retrieved successfully',
};

export const mockApiErrorResponse: ApiResponse<null> = {
  success: false,
  data: null,
  message: 'Database query execution failed',
  errors: {
    title: ['Title is required'],
  },
};
