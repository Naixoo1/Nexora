import { describe, it, expect } from 'vitest';
import {
  AcademicTutorModeSchema,
  TaskContextSnapshotSchema,
  CanvasDerivationStepSchema,
  CanvasContextSnapshotSchema,
  ChatContextPayloadSchema,
  SendChatMessageSchema,
  CreateChatSessionSchema,
  ChatSessionListQuerySchema,
} from '@/lib/validators/chat';
import {
  mockTaskId,
  mockCanvasId,
  mockTaskContext,
  mockCanvasContext,
  mockChatContextPayload,
} from '../../mocks/chatMocks';

describe('Chat Validators', () => {
  describe('AcademicTutorModeSchema', () => {
    it('should validate all valid tutor mode enum values when provided', () => {
      // Arrange
      const validModes = ['socratic', 'olympiad', 'step_breakdown', 'thesis_mentor'];

      // Act & Assert
      validModes.forEach((mode) => {
        const result = AcademicTutorModeSchema.safeParse(mode);
        expect(result.success).toBe(true);
      });
    });

    it('should fail validation when invalid tutor mode string is given', () => {
      // Arrange
      const invalidMode = 'direct_answer';

      // Act
      const result = AcademicTutorModeSchema.safeParse(invalidMode);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('TaskContextSnapshotSchema', () => {
    it('should validate complete task context snapshot and apply default values', () => {
      // Arrange
      const payload = {
        taskId: mockTaskId,
        title: 'Pembuktian Teorema Dasar Kalkulus',
        status: 'in_progress' as const,
        priority: 'high' as const,
        subtaskCount: 5,
        completedSubtaskCount: 4,
        milestoneProgressPct: 80,
      };

      // Act
      const result = TaskContextSnapshotSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskId).toBe(mockTaskId);
        expect(result.data.isOverdue).toBe(false); // Default value
        expect(result.data.milestoneProgressPct).toBe(80);
      }
    });

    it('should fail validation when taskId is not a valid UUID', () => {
      // Arrange
      const invalidPayload = {
        ...mockTaskContext,
        taskId: 'invalid-task-uuid',
      };

      // Act
      const result = TaskContextSnapshotSchema.safeParse(invalidPayload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when milestoneProgressPct exceeds 100 or is negative', () => {
      // Arrange
      const payloadExceeding = {
        ...mockTaskContext,
        milestoneProgressPct: 105,
      };
      const payloadNegative = {
        ...mockTaskContext,
        milestoneProgressPct: -10,
      };

      // Act & Assert
      expect(TaskContextSnapshotSchema.safeParse(payloadExceeding).success).toBe(false);
      expect(TaskContextSnapshotSchema.safeParse(payloadNegative).success).toBe(false);
    });

    it('should fail validation when subtask count is negative', () => {
      // Arrange
      const invalidSubtaskPayload = {
        ...mockTaskContext,
        subtaskCount: -1,
      };

      // Act
      const result = TaskContextSnapshotSchema.safeParse(invalidSubtaskPayload);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('CanvasDerivationStepSchema & CanvasContextSnapshotSchema', () => {
    it('should validate valid CanvasDerivationStepSchema with formula and validation status', () => {
      // Arrange
      const stepPayload = {
        nodeId: 'node-step-1',
        title: 'Integral Parsial',
        nodeType: 'reasoning_step' as const,
        latexFormula: '\\int u \\, dv = uv - \\int v \\, du',
        edgeType: 'implication',
        validationStatus: 'valid' as const,
      };

      // Act
      const result = CanvasDerivationStepSchema.safeParse(stepPayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodeType).toBe('reasoning_step');
        expect(result.data.validationStatus).toBe('valid');
      }
    });

    it('should validate CanvasContextSnapshotSchema with derivationPath and activeVariables defaults', () => {
      // Arrange
      const minimalCanvasPayload = {
        canvasId: mockCanvasId,
        canvasTitle: 'Kinematika 2D',
      };

      // Act
      const result = CanvasContextSnapshotSchema.safeParse(minimalCanvasPayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canvasId).toBe(mockCanvasId);
        expect(result.data.derivationPath).toEqual([]);
        expect(result.data.activeVariables).toEqual([]);
      }
    });

    it('should validate complete CanvasContextSnapshotSchema with rich path and variable arrays', () => {
      // Arrange & Act
      const result = CanvasContextSnapshotSchema.safeParse(mockCanvasContext);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.derivationPath).toHaveLength(2);
        expect(result.data.activeVariables).toHaveLength(2);
        expect(result.data.selectedNodeFormula).toContain('\\cos(\\theta)');
      }
    });

    it('should fail CanvasContextSnapshotSchema when canvasId is not a valid UUID', () => {
      // Arrange
      const invalidCanvasPayload = {
        canvasId: 'non-uuid-canvas-id',
        canvasTitle: 'Fisika',
      };

      // Act
      const result = CanvasContextSnapshotSchema.safeParse(invalidCanvasPayload);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('ChatContextPayloadSchema', () => {
    it('should default tutorMode to socratic when not explicitly specified', () => {
      // Arrange
      const emptyPayload = {};

      // Act
      const result = ChatContextPayloadSchema.safeParse(emptyPayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tutorMode).toBe('socratic');
      }
    });

    it('should validate rich context payload combining task, canvas, and custom instructions', () => {
      // Arrange & Act
      const result = ChatContextPayloadSchema.safeParse(mockChatContextPayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tutorMode).toBe('socratic');
        expect(result.data.taskContext?.title).toContain('Persamaan Bernoulli');
        expect(result.data.canvasContext?.canvasTitle).toContain('Gerak Parabola');
      }
    });

    it('should fail when customInstructions exceed 2000 characters limit', () => {
      // Arrange
      const oversizedPayload = {
        customInstructions: 'a'.repeat(2001),
      };

      // Act
      const result = ChatContextPayloadSchema.safeParse(oversizedPayload);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('SendChatMessageSchema', () => {
    it('should validate message payload with message text, sessionId, and context payload', () => {
      // Arrange
      const payload = {
        sessionId: '22222222-2222-4222-a222-222222222222',
        taskId: mockTaskId,
        canvasId: mockCanvasId,
        message: 'Tolong jelaskan langkah turunan parsial ini.',
        context: mockChatContextPayload,
      };

      // Act
      const result = SendChatMessageSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('Tolong jelaskan langkah turunan parsial ini.');
        expect(result.data.sessionId).toBe('22222222-2222-4222-a222-222222222222');
      }
    });

    it('should fail validation when message is empty string', () => {
      // Arrange
      const emptyMessagePayload = {
        message: '',
      };

      // Act
      const result = SendChatMessageSchema.safeParse(emptyMessagePayload);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Message cannot be empty');
      }
    });

    it('should fail validation when message exceeds 10000 characters limit', () => {
      // Arrange
      const oversizedPayload = {
        message: 'x'.repeat(10001),
      };

      // Act
      const result = SendChatMessageSchema.safeParse(oversizedPayload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when invalid UUID is provided for sessionId, taskId, or canvasId', () => {
      // Arrange
      const invalidSessionUuid = { message: 'Hello', sessionId: 'not-a-uuid' };
      const invalidTaskUuid = { message: 'Hello', taskId: 'not-a-uuid' };
      const invalidCanvasUuid = { message: 'Hello', canvasId: 'not-a-uuid' };

      // Act & Assert
      expect(SendChatMessageSchema.safeParse(invalidSessionUuid).success).toBe(false);
      expect(SendChatMessageSchema.safeParse(invalidTaskUuid).success).toBe(false);
      expect(SendChatMessageSchema.safeParse(invalidCanvasUuid).success).toBe(false);
    });
  });

  describe('CreateChatSessionSchema & ChatSessionListQuerySchema', () => {
    it('should validate CreateChatSessionSchema and apply default title and tutorMode', () => {
      // Arrange
      const payload = {
        taskId: mockTaskId,
      };

      // Act
      const result = CreateChatSessionSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('New Brainstorming Session');
        expect(result.data.tutorMode).toBe('socratic');
        expect(result.data.taskId).toBe(mockTaskId);
      }
    });

    it('should validate CreateChatSessionSchema with explicit custom title and olympiad mode', () => {
      // Arrange
      const payload = {
        title: 'Analisis Teori Graf & Invarian',
        tutorMode: 'olympiad' as const,
      };

      // Act
      const result = CreateChatSessionSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Analisis Teori Graf & Invarian');
        expect(result.data.tutorMode).toBe('olympiad');
      }
    });

    it('should validate ChatSessionListQuerySchema, coerce string page/limit and apply defaults', () => {
      // Arrange
      const queryParams = {
        taskId: mockTaskId,
        page: '2',
        limit: '10',
      };

      // Act
      const result = ChatSessionListQuerySchema.safeParse(queryParams);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
        expect(result.data.taskId).toBe(mockTaskId);
      }
    });

    it('should fallback to page 1 and limit 20 when query parameters are omitted', () => {
      // Arrange
      const emptyParams = {};

      // Act
      const result = ChatSessionListQuerySchema.safeParse(emptyParams);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should fail ChatSessionListQuerySchema when limit exceeds 50', () => {
      // Arrange
      const invalidLimitParams = {
        limit: '75',
      };

      // Act
      const result = ChatSessionListQuerySchema.safeParse(invalidLimitParams);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
