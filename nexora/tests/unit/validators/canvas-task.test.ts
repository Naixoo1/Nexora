import { describe, it, expect } from 'vitest';
import {
  NodeToTaskConvertSchema,
  CanvasTasksQuerySchema,
} from '@/lib/validators/canvas-task';

describe('Canvas Task Validators', () => {
  describe('NodeToTaskConvertSchema', () => {
    it('validates empty object with sensible defaults', () => {
      const parsed = NodeToTaskConvertSchema.parse({});
      expect(parsed.priority).toBe('medium');
      expect(parsed.includeVariablesInDescription).toBe(true);
      expect(parsed.includeLatexInDescription).toBe(true);
    });

    it('validates custom conversion payload', () => {
      const payload = {
        title: 'Review Step 2 Integration by Parts',
        description: 'Focus on verifying the boundary condition at infinity.',
        priority: 'high' as const,
        category: 'Calculus',
        dueDate: '2026-09-01T12:00:00.000Z',
        parentTaskId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        includeVariablesInDescription: false,
        includeLatexInDescription: true,
      };

      const parsed = NodeToTaskConvertSchema.parse(payload);
      expect(parsed.title).toBe('Review Step 2 Integration by Parts');
      expect(parsed.priority).toBe('high');
      expect(parsed.parentTaskId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(parsed.includeVariablesInDescription).toBe(false);
    });

    it('rejects invalid UUID for parentTaskId', () => {
      expect(() =>
        NodeToTaskConvertSchema.parse({
          parentTaskId: 'invalid-uuid-string',
        })
      ).toThrow();
    });
  });

  describe('CanvasTasksQuerySchema', () => {
    it('validates query parameters with defaults', () => {
      const parsed = CanvasTasksQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(50);
    });

    it('validates filter parameters', () => {
      const parsed = CanvasTasksQuerySchema.parse({
        status: 'in_progress',
        priority: 'urgent',
        page: '3',
        limit: '25',
      });

      expect(parsed.status).toBe('in_progress');
      expect(parsed.priority).toBe('urgent');
      expect(parsed.page).toBe(3);
      expect(parsed.limit).toBe(25);
    });
  });
});
