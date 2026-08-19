import type {
  ChatMessage,
  ChatSession,
  ChatSessionWithMessages,
  TaskContextSnapshot,
  CanvasContextSnapshot,
  ChatContextPayload,
  ChatSourceCitation,
  ChatAttachment,
  ChatAttachmentMeta,
} from '@/types/chat';
import type { ApiResponse } from '@/types/canvas';

export const mockUserId = '11111111-1111-4111-a111-111111111111';
export const mockSessionId = '22222222-2222-4222-a222-222222222222';
export const mockTaskId = '33333333-3333-4333-a333-333333333331';
export const mockCanvasId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

export const mockTaskContext: TaskContextSnapshot = {
  taskId: mockTaskId,
  title: 'Kalkulus Integral: Derivasi Persamaan Bernoulli',
  description: 'Turunkan hukum kontinuitas fluida dan persamaan Bernoulli dari hukum kekekalan energi mekanik.',
  status: 'in_progress',
  priority: 'high',
  category: 'Fisika & Matematika',
  dueDate: '2026-09-01T12:00:00.000Z',
  isOverdue: false,
  subtaskCount: 4,
  completedSubtaskCount: 3,
  milestoneProgressPct: 75,
};

export const mockOverdueTaskContext: TaskContextSnapshot = {
  taskId: '44444444-4444-4444-a444-444444444444',
  title: 'Tugas Aljabar Linear: Nilai Eigen & Vektor Eigen',
  description: 'Tentukan ruang eigen matriks 3x3 simetris.',
  status: 'todo',
  priority: 'urgent',
  category: 'Matematika',
  dueDate: '2026-08-01T12:00:00.000Z',
  isOverdue: true,
  subtaskCount: 5,
  completedSubtaskCount: 1,
  milestoneProgressPct: 20,
};

export const mockCanvasContext: CanvasContextSnapshot = {
  canvasId: mockCanvasId,
  canvasTitle: 'Derivasi Gerak Parabola & Jangkauan Maksimum',
  category: 'Fisika Klasik',
  selectedNodeId: 'node-step-1',
  selectedNodeType: 'reasoning_step',
  selectedNodeTitle: 'Dekomposisi Vektor Kecepatan',
  selectedNodeFormula: 'v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt',
  selectedNodeValidation: 'valid',
  derivationPath: [
    {
      nodeId: 'node-root-1',
      title: 'Problem Root: Proyektil 2D',
      nodeType: 'problem_root',
      latexFormula: 'R = \\frac{v_0^2 \\sin(2\\theta)}{g}',
      edgeType: 'implication',
      validationStatus: 'valid',
    },
    {
      nodeId: 'node-step-1',
      title: 'Dekomposisi Vektor Kecepatan',
      nodeType: 'reasoning_step',
      latexFormula: 'v_x = v_0 \\cos(\\theta), \\quad v_y = v_0 \\sin(\\theta) - gt',
      edgeType: 'implication',
      validationStatus: 'valid',
    },
  ],
  activeVariables: [
    {
      id: 'var-v0',
      name: 'v_0',
      symbol: 'v_0',
      label: 'Initial Velocity',
      value: 25,
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
};

export const mockChatContextPayload: ChatContextPayload = {
  tutorMode: 'socratic',
  taskContext: mockTaskContext,
  canvasContext: mockCanvasContext,
  customInstructions: 'Gunakan Bahasa Indonesia formal dan berikan penekanan pada konsep dasar sebelum rumus.',
};

export const mockCitation1: ChatSourceCitation = {
  id: 'cite-1',
  sourceType: 'canvas_node',
  referenceId: 'node-root-1',
  label: 'Problem Root: Proyektil 2D',
};

export const mockCitation2: ChatSourceCitation = {
  id: 'cite-2',
  sourceType: 'task',
  referenceId: mockTaskId,
  label: 'Task: Kalkulus Integral',
};

// ── Multimodal Attachments Mock Fixtures ──────────────────
export const mockImageAttachment: ChatAttachment = {
  id: 'att-img-1',
  name: 'calculus_problem.png',
  type: 'image',
  mimeType: 'image/png',
  data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  size: 1024,
};

export const mockPdfAttachment: ChatAttachment = {
  id: 'att-pdf-1',
  name: 'physics_homework.pdf',
  type: 'pdf',
  mimeType: 'application/pdf',
  data: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM=',
  size: 20480,
};

export const mockTextAttachment: ChatAttachment = {
  id: 'att-txt-1',
  name: 'derivation_notes.txt',
  type: 'text',
  mimeType: 'text/plain',
  data: 'Rumus energi kinetik: E_k = 1/2 m v^2 dan energi potensial: E_p = m g h',
  size: 256,
};

export const mockAttachmentMetaList: ChatAttachmentMeta[] = [
  {
    id: mockImageAttachment.id,
    name: mockImageAttachment.name,
    type: mockImageAttachment.type,
    mimeType: mockImageAttachment.mimeType,
    size: mockImageAttachment.size,
  },
  {
    id: mockPdfAttachment.id,
    name: mockPdfAttachment.name,
    type: mockPdfAttachment.type,
    mimeType: mockPdfAttachment.mimeType,
    size: mockPdfAttachment.size,
  },
];

export const mockUserMessage: ChatMessage = {
  id: 'msg-user-1',
  sessionId: mockSessionId,
  userId: mockUserId,
  role: 'user',
  content: 'Bagaimana membuktikan bahwa jangkauan horisontal $R$ mencapai maksimum saat sudut elevasi $\\theta = 45^\\circ$?',
  contextSnapshot: mockChatContextPayload,
  createdAt: '2026-08-19T10:00:00.000Z',
};

export const mockMultimodalUserMessage: ChatMessage = {
  id: 'msg-user-multi',
  sessionId: mockSessionId,
  userId: mockUserId,
  role: 'user',
  content: 'Tolong analisis soal pada gambar terlampir dan berikan langkah penurunannya.',
  attachments: mockAttachmentMetaList,
  contextSnapshot: mockChatContextPayload,
  createdAt: '2026-08-19T10:05:00.000Z',
};

export const mockAssistantMessage: ChatMessage = {
  id: 'msg-asst-1',
  sessionId: mockSessionId,
  userId: mockUserId,
  role: 'assistant',
  content: 'Mari kita telaah fungsi jangkauan horisontal:\n\n$$\nR(\\theta) = \\frac{v_0^2 \\sin(2\\theta)}{g}\n$$\n\nPerhatikan bahwa nilai maksimum fungsi $\\sin(x)$ adalah $1$, yang terjadi ketika argumen bernilai $90^\\circ$. Berdasarkan [[node:node-root-1|Problem Root: Proyektil 2D]], apakah ada faktor lain seperti hambatan udara yang perlu dipertimbangkan?',
  citations: [mockCitation1],
  createdAt: '2026-08-19T10:00:02.000Z',
};

export const mockChatSession: ChatSession = {
  id: mockSessionId,
  userId: mockUserId,
  taskId: mockTaskId,
  canvasId: mockCanvasId,
  title: 'Diskusi Gerak Parabola & Pembuktian Sudut Optimal',
  tutorMode: 'socratic',
  createdAt: '2026-08-19T10:00:00.000Z',
  updatedAt: '2026-08-19T10:00:02.000Z',
};

export const mockOlympiadChatSession: ChatSession = {
  id: '55555555-5555-5555-a555-555555555555',
  userId: mockUserId,
  taskId: null,
  canvasId: mockCanvasId,
  title: 'Olimpiade Fisika: Mekanika Lagrange & Hamilton',
  tutorMode: 'olympiad',
  createdAt: '2026-08-19T09:00:00.000Z',
  updatedAt: '2026-08-19T09:30:00.000Z',
};

export const mockStepBreakdownChatSession: ChatSession = {
  id: '66666666-6666-6666-a666-666666666666',
  userId: mockUserId,
  taskId: mockTaskId,
  canvasId: null,
  title: 'Langkah Penurunan Persamaan Diferensial Orde 2',
  tutorMode: 'step_breakdown',
  createdAt: '2026-08-19T08:00:00.000Z',
  updatedAt: '2026-08-19T08:20:00.000Z',
};

export const mockThesisMentorChatSession: ChatSession = {
  id: '77777777-7777-7777-a777-777777777777',
  userId: mockUserId,
  taskId: null,
  canvasId: mockCanvasId,
  title: 'Metodologi Penelitian: Validasi Model Numerik',
  tutorMode: 'thesis_mentor',
  createdAt: '2026-08-19T07:00:00.000Z',
  updatedAt: '2026-08-19T07:45:00.000Z',
};

export const mockChatSessionWithMessages: ChatSessionWithMessages = {
  ...mockChatSession,
  messages: [mockUserMessage, mockAssistantMessage],
};

export const mockSessionListApiResponse: ApiResponse<{ items: ChatSession[] }> = {
  success: true,
  data: {
    items: [
      mockChatSession,
      mockOlympiadChatSession,
      mockStepBreakdownChatSession,
      mockThesisMentorChatSession,
    ],
  },
  message: 'Chat sessions retrieved successfully',
};

export const mockSessionDetailApiResponse: ApiResponse<ChatSessionWithMessages> = {
  success: true,
  data: mockChatSessionWithMessages,
  message: 'Chat session history loaded successfully',
};

export const mockCreateSessionApiResponse: ApiResponse<ChatSession> = {
  success: true,
  data: mockChatSession,
  message: 'Chat session created successfully',
};

/**
 * Creates a mock ReadableStream that yields chunks sequentially
 */
export function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
