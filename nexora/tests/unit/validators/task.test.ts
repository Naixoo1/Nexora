import { describe, it, expect } from 'vitest';
import {
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskSourceSchema,
  ProgressStatusSchema,
  ProgressTargetSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateProgressSchema,
  UpdateProgressSchema,
  TaskListQuerySchema,
  PlannerGenerateSchema,
} from '@/lib/validators/task';

describe('Task & Progress Validators', () => {
  describe('Enum & Basic Schemas', () => {
    it('should validate valid TaskStatus values when provided', () => {
      // Arrange
      const validStatuses = ['todo', 'in_progress', 'completed', 'cancelled'];

      // Act & Assert
      validStatuses.forEach((status) => {
        const result = TaskStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should fail validation for invalid TaskStatus values when provided', () => {
      // Arrange
      const invalidStatus = 'archived';

      // Act
      const result = TaskStatusSchema.safeParse(invalidStatus);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate valid TaskPriority values when provided', () => {
      // Arrange
      const validPriorities = ['low', 'medium', 'high', 'urgent'];

      // Act & Assert
      validPriorities.forEach((priority) => {
        const result = TaskPrioritySchema.safeParse(priority);
        expect(result.success).toBe(true);
      });
    });

    it('should validate valid TaskSource values when provided', () => {
      // Arrange
      const validSources = ['manual', 'ai_planner', 'ai_brainstorm'];

      // Act & Assert
      validSources.forEach((source) => {
        const result = TaskSourceSchema.safeParse(source);
        expect(result.success).toBe(true);
      });
    });

    it('should validate valid ProgressStatus values when provided', () => {
      // Arrange
      const validStatuses = ['active', 'paused', 'completed', 'cancelled'];

      // Act & Assert
      validStatuses.forEach((status) => {
        const result = ProgressStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should validate valid ProgressTarget when label and completed status are valid', () => {
      // Arrange
      const target = { label: 'Kerjakan studi kasus 1', completed: false };

      // Act
      const result = ProgressTargetSchema.safeParse(target);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should fail ProgressTarget validation when label is empty string', () => {
      // Arrange
      const invalidTarget = { label: '', completed: false };

      // Act
      const result = ProgressTargetSchema.safeParse(invalidTarget);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('CreateTaskSchema', () => {
    it('should validate and apply default values when minimal valid payload is given', () => {
      // Arrange
      const payload = {
        title: 'Mengerjakan PR Fisika',
      };

      // Act
      const result = CreateTaskSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Mengerjakan PR Fisika');
        expect(result.data.status).toBe('todo');
        expect(result.data.priority).toBe('medium');
        expect(result.data.source).toBe('manual');
        expect(result.data.sortOrder).toBe(0);
      }
    });

    it('should validate completely filled payload when all fields are properly formatted', () => {
      // Arrange
      const payload = {
        title: 'Persiapan Ujian Matematika',
        description: 'Bab Integral dan Turunan Parsial',
        parentId: '11111111-1111-4111-a111-111111111111',
        status: 'in_progress' as const,
        priority: 'high' as const,
        category: 'Matematika',
        dueDate: '2026-08-25T15:00:00.000Z',
        source: 'ai_planner' as const,
        aiSessionId: '22222222-2222-4222-a222-222222222222',
        sortOrder: 2,
      };

      // Act
      const result = CreateTaskSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentId).toBe('11111111-1111-4111-a111-111111111111');
        expect(result.data.status).toBe('in_progress');
        expect(result.data.priority).toBe('high');
        expect(result.data.source).toBe('ai_planner');
      }
    });

    it('should fail validation when title is empty string', () => {
      // Arrange
      const payload = {
        title: '',
      };

      // Act
      const result = CreateTaskSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when title exceeds 255 characters', () => {
      // Arrange
      const payload = {
        title: 'a'.repeat(256),
      };

      // Act
      const result = CreateTaskSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when parentId is not a valid UUID', () => {
      // Arrange
      const payload = {
        title: 'Subtask with invalid parent',
        parentId: 'invalid-not-a-uuid',
      };

      // Act
      const result = CreateTaskSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when dueDate is not an ISO datetime with timezone offset', () => {
      // Arrange
      const payload = {
        title: 'Task with invalid date',
        dueDate: '2026-08-25', // missing time and offset
      };

      // Act
      const result = CreateTaskSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateTaskSchema', () => {
    it('should validate partial update when single field is provided', () => {
      // Arrange
      const payload = {
        status: 'completed' as const,
      };

      // Act
      const result = UpdateTaskSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('completed');
      }
    });

    it('should validate when nullable fields are set to null', () => {
      // Arrange
      const payload = {
        description: null,
        parentId: null,
        category: null,
        dueDate: null,
      };

      // Act
      const result = UpdateTaskSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
        expect(result.data.parentId).toBeNull();
      }
    });

    it('should fail validation when empty object is submitted', () => {
      // Arrange
      const emptyPayload = {};

      // Act
      const result = UpdateTaskSchema.safeParse(emptyPayload);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'At least one field must be provided for update'
        );
      }
    });
  });

  describe('CreateProgressSchema & UpdateProgressSchema', () => {
    it('should validate CreateProgressSchema when valid task ID, steps, and targets are provided', () => {
      // Arrange
      const payload = {
        taskId: '11111111-1111-4111-a111-111111111111',
        totalSteps: 3,
        targets: [
          { label: 'Step 1: Brainstorming idea', completed: true },
          { label: 'Step 2: Logic Tree derivation', completed: false },
          { label: 'Step 3: Verification', completed: false },
        ],
      };

      // Act
      const result = CreateProgressSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should fail CreateProgressSchema when totalSteps is less than 1', () => {
      // Arrange
      const payload = {
        taskId: '11111111-1111-4111-a111-111111111111',
        totalSteps: 0,
        targets: [{ label: 'Step 1', completed: false }],
      };

      // Act
      const result = CreateProgressSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail CreateProgressSchema when targets array is empty', () => {
      // Arrange
      const payload = {
        taskId: '11111111-1111-4111-a111-111111111111',
        totalSteps: 2,
        targets: [],
      };

      // Act
      const result = CreateProgressSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should validate UpdateProgressSchema when partial fields are updated', () => {
      // Arrange
      const payload = {
        completedSteps: 2,
        status: 'active' as const,
      };

      // Act
      const result = UpdateProgressSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should fail UpdateProgressSchema when negative completedSteps is provided', () => {
      // Arrange
      const payload = {
        completedSteps: -1,
      };

      // Act
      const result = UpdateProgressSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail UpdateProgressSchema when empty payload is submitted', () => {
      // Arrange
      const payload = {};

      // Act
      const result = UpdateProgressSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('TaskListQuerySchema', () => {
    it('should apply defaults and coerce string page/limit when valid strings are passed', () => {
      // Arrange
      const queryParams = {
        page: '2',
        limit: '50',
        search: 'Fisika',
      };

      // Act
      const result = TaskListQuerySchema.safeParse(queryParams);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortBy).toBe('sort_order');
        expect(result.data.sortDir).toBe('asc');
        expect(result.data.search).toBe('Fisika');
      }
    });

    it('should fail validation when limit exceeds 100', () => {
      // Arrange
      const queryParams = {
        limit: '150',
      };

      // Act
      const result = TaskListQuerySchema.safeParse(queryParams);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('PlannerGenerateSchema', () => {
    it('should validate valid planner prompt and set default maxTasks to 10', () => {
      // Arrange
      const payload = {
        prompt: 'Rencanakan belajar kalkulus lanjut untuk UTS minggu depan',
        category: 'Matematika',
      };

      // Act
      const result = PlannerGenerateSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxTasks).toBe(10);
        expect(result.data.prompt).toBe('Rencanakan belajar kalkulus lanjut untuk UTS minggu depan');
      }
    });

    it('should fail validation when planner prompt is empty', () => {
      // Arrange
      const payload = {
        prompt: '',
      };

      // Act
      const result = PlannerGenerateSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should fail validation when maxTasks exceeds 50', () => {
      // Arrange
      const payload = {
        prompt: 'Buat rencana belajar detail',
        maxTasks: 51,
      };

      // Act
      const result = PlannerGenerateSchema.safeParse(payload);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
