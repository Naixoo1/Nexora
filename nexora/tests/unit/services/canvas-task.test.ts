import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertNodeToTask, listCanvasLinkedTasks } from '@/services/canvas-task';
import {
  mockUserId,
  mockCanvasId,
  mockNodeId,
  mockParentTaskId,
  mockDbCanvas,
  mockDbNode,
  mockNodeToTaskPayload,
  mockCustomNodeToTaskPayload,
  mockConvertedTask,
} from '../../mocks/canvasTaskMocks';

// Hoist mock object for Drizzle db queries
const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

describe('Canvas Task Service (canvas-task.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertNodeToTask', () => {
    it('should convert canvas node to task with auto-generated title, LaTeX block, parameters, and canvas attribution', async () => {
      // Arrange
      // 1. Canvas query return [mockDbCanvas]
      const selectCanvasBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockDbCanvas]),
      };

      // 2. Node query return [mockDbNode]
      const selectNodeBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockDbNode]),
      };

      mockDb.select
        .mockReturnValueOnce(selectCanvasBuilder)
        .mockReturnValueOnce(selectNodeBuilder);

      // 3. Insert task return [mockConvertedTask]
      const insertTaskBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockConvertedTask]),
      };
      mockDb.insert.mockReturnValue(insertTaskBuilder);

      // Act
      const result = await convertNodeToTask(
        mockCanvasId,
        mockNodeId,
        mockUserId,
        mockNodeToTaskPayload
      );

      // Assert
      expect(result).toEqual(mockConvertedTask);
      expect(insertTaskBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          source: 'canvas_export',
          canvasNodeId: mockNodeId,
          title: '[Derivation Step] Dekomposisi Vektor Kecepatan',
          priority: 'high',
          category: 'Fisika Klasik',
          latexFormula: mockDbNode.latexFormula,
          nodeX: 450,
          nodeY: 100,
        })
      );

      // Check description contains mathematical formulation and active parameters
      const insertedValues = insertTaskBuilder.values.mock.calls[0][0];
      expect(insertedValues.description).toContain('### Mathematical Formulation');
      expect(insertedValues.description).toContain('v_x = v_0 \\cos(\\theta)');
      expect(insertedValues.description).toContain('### Active Parameters');
      expect(insertedValues.description).toContain('Initial Velocity');
      expect(insertedValues.description).toContain('Exported from STEM Canvas');
    });

    it('should use custom title and description overrides when provided in payload', async () => {
      // Arrange
      const selectCanvasBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockDbCanvas]),
      };
      const selectNodeBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockDbNode]),
      };
      const selectParentTaskBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: mockParentTaskId, parentId: null }]),
      };
      // getTaskDepth: first call returns parentId: null (depth 1)
      const selectDepthBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ parentId: null }]),
      };

      mockDb.select
        .mockReturnValueOnce(selectCanvasBuilder)
        .mockReturnValueOnce(selectNodeBuilder)
        .mockReturnValueOnce(selectParentTaskBuilder)
        .mockReturnValueOnce(selectDepthBuilder);

      const customCreatedTask = {
        ...mockConvertedTask,
        title: mockCustomNodeToTaskPayload.title!,
        description: mockCustomNodeToTaskPayload.description!,
        priority: 'urgent' as const,
        category: 'Praktikum Fisika',
      };

      const insertTaskBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([customCreatedTask]),
      };
      mockDb.insert.mockReturnValue(insertTaskBuilder);

      // Act
      const result = await convertNodeToTask(
        mockCanvasId,
        mockNodeId,
        mockUserId,
        mockCustomNodeToTaskPayload
      );

      // Assert
      expect(result.title).toBe(mockCustomNodeToTaskPayload.title);
      expect(result.description).toBe(mockCustomNodeToTaskPayload.description);
      expect(insertTaskBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: mockParentTaskId,
          priority: 'urgent',
          category: 'Praktikum Fisika',
        })
      );
    });

    it('should omit LaTeX and parameters from description when flags are false', async () => {
      // Arrange
      const selectCanvasBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockDbCanvas]),
      };
      const selectNodeBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockDbNode]),
      };

      mockDb.select
        .mockReturnValueOnce(selectCanvasBuilder)
        .mockReturnValueOnce(selectNodeBuilder);

      const insertTaskBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockConvertedTask]),
      };
      mockDb.insert.mockReturnValue(insertTaskBuilder);

      // Act
      await convertNodeToTask(mockCanvasId, mockNodeId, mockUserId, {
        includeVariablesInDescription: false,
        includeLatexInDescription: false,
        priority: 'medium',
      });

      // Assert
      const insertedValues = insertTaskBuilder.values.mock.calls[0][0];
      expect(insertedValues.description).not.toContain('### Mathematical Formulation');
      expect(insertedValues.description).not.toContain('### Active Parameters');
      expect(insertedValues.description).toContain(mockDbNode.content);
    });

    it('should map different node types to appropriate human-friendly title prefixes', async () => {
      // Arrange
      const nodeTypes = [
        { type: 'problem_root', expectedPrefix: '[Problem]' },
        { type: 'what_if_branch', expectedPrefix: '[What-If Simulation]' },
        { type: 'theorem_proof', expectedPrefix: '[Theorem / Proof]' },
        { type: 'formula_block', expectedPrefix: '[Formula]' },
        { type: 'custom_node', expectedPrefix: '[Canvas Step]' },
      ];

      for (const { type, expectedPrefix } of nodeTypes) {
        mockDb.select
          .mockReturnValueOnce({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([mockDbCanvas]),
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([{ ...mockDbNode, nodeType: type }]),
          });

        const insertBuilder = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockConvertedTask]),
        };
        mockDb.insert.mockReturnValue(insertBuilder);

        // Act
        await convertNodeToTask(mockCanvasId, mockNodeId, mockUserId, {
          priority: 'medium',
          includeVariablesInDescription: true,
          includeLatexInDescription: true,
        });

        // Assert
        const insertedTitle = insertBuilder.values.mock.calls[0][0].title;
        expect(insertedTitle).toContain(expectedPrefix);
      }
    });

    it('should throw error when canvas is not found or unauthorized', async () => {
      // Arrange: Canvas query returns empty array
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      // Act & Assert
      await expect(
        convertNodeToTask(mockCanvasId, mockNodeId, mockUserId, mockNodeToTaskPayload)
      ).rejects.toThrow('Canvas not found or unauthorized');
    });

    it('should throw error when node is not found in canvas', async () => {
      // Arrange: Canvas found, but node query returns empty array
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([mockDbCanvas]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
        });

      // Act & Assert
      await expect(
        convertNodeToTask(mockCanvasId, mockNodeId, mockUserId, mockNodeToTaskPayload)
      ).rejects.toThrow('Canvas node not found');
    });

    it('should throw error when parent task is not found or unauthorized', async () => {
      // Arrange: Canvas and Node found, but parent task not found
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([mockDbCanvas]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([mockDbNode]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
        });

      // Act & Assert
      await expect(
        convertNodeToTask(mockCanvasId, mockNodeId, mockUserId, {
          ...mockNodeToTaskPayload,
          parentTaskId: mockParentTaskId,
        })
      ).rejects.toThrow('Parent task not found or unauthorized');
    });

    it('should throw error when sub-task depth limit of 3 levels is exceeded', async () => {
      // Arrange: Canvas and Node found, parent task found with depth 3
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([mockDbCanvas]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([mockDbNode]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ id: mockParentTaskId, parentId: 'p2' }]),
        })
        // getTaskDepth: 3 levels deep
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ parentId: 'p2' }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ parentId: 'p3' }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ parentId: 'p4' }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]), // terminates getTaskDepth loop
        });

      // Act & Assert
      await expect(
        convertNodeToTask(mockCanvasId, mockNodeId, mockUserId, {
          ...mockNodeToTaskPayload,
          parentTaskId: mockParentTaskId,
        })
      ).rejects.toThrow('Maximum sub-task depth of 3 levels exceeded');
    });
  });

  describe('listCanvasLinkedTasks', () => {
    it('should list all tasks linked to canvas nodes with node title annotations and pagination', async () => {
      // Arrange
      // 1. Verify canvas
      const selectCanvasBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: mockCanvasId }]),
      };

      // 2. Fetch canvas nodes
      const selectNodesBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: mockNodeId, title: 'Dekomposisi Vektor Kecepatan' }]),
      };

      // 3. Count query
      const selectCountBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1 }]),
      };

      // 4. Tasks list query
      const selectTasksBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([mockConvertedTask]),
      };

      mockDb.select
        .mockReturnValueOnce(selectCanvasBuilder)
        .mockReturnValueOnce(selectNodesBuilder)
        .mockReturnValueOnce(selectCountBuilder)
        .mockReturnValueOnce(selectTasksBuilder);

      // Act
      const result = await listCanvasLinkedTasks(mockCanvasId, mockUserId, {
        status: 'todo',
        priority: 'high',
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(mockConvertedTask.id);
      expect(result.items[0].canvasNodeTitle).toBe('Dekomposisi Vektor Kecepatan');
      expect(result.totalPages).toBe(1);
    });

    it('should return empty list immediately when canvas has no nodes', async () => {
      // Arrange
      const selectCanvasBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: mockCanvasId }]),
      };
      const selectEmptyNodesBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      mockDb.select
        .mockReturnValueOnce(selectCanvasBuilder)
        .mockReturnValueOnce(selectEmptyNodesBuilder);

      // Act
      const result = await listCanvasLinkedTasks(mockCanvasId, mockUserId, {
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw error when canvas is not found or unauthorized', async () => {
      // Arrange
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      // Act & Assert
      await expect(
        listCanvasLinkedTasks(mockCanvasId, mockUserId, { page: 1, limit: 20 })
      ).rejects.toThrow('Canvas not found or unauthorized');
    });
  });
});
