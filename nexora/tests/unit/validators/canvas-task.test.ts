import { describe, it, expect } from 'vitest';
import {
  NodeToTaskConvertSchema,
  CanvasTasksQuerySchema,
} from '@/lib/validators/canvas-task';
import { mockParentTaskId } from '../../mocks/canvasTaskMocks';

describe('Canvas Task Validators', () => {
  describe('NodeToTaskConvertSchema', () => {
    it('should validate empty object and apply standard default values', () => {
      // Arrange
      const payload = {};

      // Act
      const result = NodeToTaskConvertSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('medium');
        expect(result.data.includeVariablesInDescription).toBe(true);
        expect(result.data.includeLatexInDescription).toBe(true);
      }
    });

    it('should validate full custom payload with custom title, category, priority, and parentTaskId', () => {
      // Arrange
      const customPayload = {
        title: 'Verifikasi Vektor Kecepatan di Laboratorium',
        description: 'Lakukan pengukuran eksperimental sudut dan jangkauan horizontal.',
        priority: 'high' as const,
        category: 'Praktikum Fisika',
        dueDate: '2026-09-30T12:00:00.000Z',
        parentTaskId: mockParentTaskId,
        includeVariablesInDescription: false,
        includeLatexInDescription: false,
      };

      // Act
      const result = NodeToTaskConvertSchema.safeParse(customPayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Verifikasi Vektor Kecepatan di Laboratorium');
        expect(result.data.priority).toBe('high');
        expect(result.data.parentTaskId).toBe(mockParentTaskId);
        expect(result.data.includeVariablesInDescription).toBe(false);
        expect(result.data.includeLatexInDescription).toBe(false);
      }
    });

    it('should fail validation when parentTaskId is not a valid UUID', () => {
      // Arrange
      const invalidPayload = {
        parentTaskId: 'invalid-parent-uuid',
      };

      // Act
      const result = NodeToTaskConvertSchema.safeParse(invalidPayload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when title is empty string', () => {
      // Arrange
      const invalidPayload = {
        title: '',
      };

      // Act
      const result = NodeToTaskConvertSchema.safeParse(invalidPayload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when description exceeds 5000 characters limit', () => {
      // Arrange
      const oversizedPayload = {
        description: 'x'.repeat(5001),
      };

      // Act
      const result = NodeToTaskConvertSchema.safeParse(oversizedPayload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when dueDate is not a valid ISO datetime format with timezone offset', () => {
      // Arrange
      const invalidDatePayload = {
        dueDate: '2026-09-30', // Missing time and offset
      };

      // Act
      const result = NodeToTaskConvertSchema.safeParse(invalidDatePayload);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('CanvasTasksQuerySchema', () => {
    it('should apply defaults of page=1 and limit=50 when query parameters are omitted', () => {
      // Arrange
      const emptyQuery = {};

      // Act
      const result = CanvasTasksQuerySchema.safeParse(emptyQuery);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should coerce string numbers into integer page and limit and validate status/priority filters', () => {
      // Arrange
      const queryPayload = {
        status: 'in_progress',
        priority: 'urgent',
        page: '3',
        limit: '25',
      };

      // Act
      const result = CanvasTasksQuerySchema.safeParse(queryPayload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('in_progress');
        expect(result.data.priority).toBe('urgent');
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(25);
      }
    });

    it('should fail validation when limit exceeds 100 maximum limit', () => {
      // Arrange
      const invalidQuery = {
        limit: '150',
      };

      // Act
      const result = CanvasTasksQuerySchema.safeParse(invalidQuery);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when page number is zero or negative', () => {
      // Arrange
      const invalidPageQuery = {
        page: '0',
      };

      // Act
      const result = CanvasTasksQuerySchema.safeParse(invalidPageQuery);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
