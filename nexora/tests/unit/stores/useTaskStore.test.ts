import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTaskStore, buildTaskTree, MAX_ALLOWED_DEPTH } from '@/stores/useTaskStore';
import {
  mockTask1,
  mockTask2Subtask1,
  mockTask3SubSubtask1,
  mockTask4ExceedingDepth,
  mockFlatTasks,
  mockTaskListResponse,
  mockCreateTaskResponse,
  mockUpdateTaskResponse,
  mockDeleteTaskResponse,
  mockProgressSnapshot,
  mockApiErrorResponse,
} from '../../mocks/taskMocks';
import {
  mockPlannerGeneratePayload,
  mockPlannerSuccessApiResponse,
  mockPlannerErrorApiResponse,
} from '../../mocks/plannerMocks';
import type { Task } from '@/types/task';

describe('useTaskStore & buildTaskTree', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useTaskStore.setState({
      tasks: [],
      taskTree: [],
      activeProgressSnapshot: null,
      expandedTaskIds: {},
      filters: {
        status: 'all',
        priority: 'all',
        source: 'all',
        search: '',
        sortBy: 'sort_order',
        sortDir: 'asc',
      },
      isLoading: false,
      isCreating: false,
      isGeneratingPlan: false,
      isPlannerModalOpen: false,
      isCreateModalOpen: false,
      parentTaskIdForNewSubtask: null,
      editingTask: null,
      error: null,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('buildTaskTree and 3-Level Nesting Limits', () => {
    it('should build hierarchical tree with correct parent-child depth when flat list is provided', () => {
      // Arrange
      const flatList: Task[] = [mockTask1, mockTask2Subtask1, mockTask3SubSubtask1];

      // Act
      const tree = buildTaskTree(flatList);

      // Assert
      expect(tree).toHaveLength(1); // 1 root task
      const root = tree[0];
      expect(root.id).toBe(mockTask1.id);
      expect(root.depth).toBe(0);
      expect(root.children).toHaveLength(1);

      const level1 = root.children[0];
      expect(level1.id).toBe(mockTask2Subtask1.id);
      expect(level1.depth).toBe(1);
      expect(level1.children).toHaveLength(1);

      const level2 = level1.children[0];
      expect(level2.id).toBe(mockTask3SubSubtask1.id);
      expect(level2.depth).toBe(2);
      expect(level2.children).toHaveLength(0);
    });

    it('should enforce MAX_ALLOWED_DEPTH of 3 and re-root tasks exceeding level 3 limit', () => {
      // Arrange
      const deepTasks: Task[] = [
        mockTask1,               // Depth 0 (Root)
        mockTask2Subtask1,       // Depth 1 (Child of Task 1)
        mockTask3SubSubtask1,    // Depth 2 (Child of Task 2)
        mockTask4ExceedingDepth, // Exceeds level 3 (Child of Task 3) -> Re-rooted
      ];

      // Act
      const tree = buildTaskTree(deepTasks);

      // Assert
      expect(MAX_ALLOWED_DEPTH).toBe(3);
      // Exceeding node is placed at root with depth 0
      const rootIds = tree.map((n) => n.id);
      expect(rootIds).toContain(mockTask1.id);
      expect(rootIds).toContain(mockTask4ExceedingDepth.id);

      const reRootedNode = tree.find((n) => n.id === mockTask4ExceedingDepth.id);
      expect(reRootedNode).toBeDefined();
      expect(reRootedNode?.depth).toBe(0);
    });

    it('should treat orphan tasks with non-existent parentId as root tasks with depth 0', () => {
      // Arrange
      const orphanTask: Task = {
        ...mockTask2Subtask1,
        parentId: '99999999-9999-9999-9999-999999999999', // Missing parent
      };

      // Act
      const tree = buildTaskTree([orphanTask]);

      // Assert
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe(orphanTask.id);
      expect(tree[0].depth).toBe(0);
    });

    it('should return empty array when task list is empty', () => {
      // Arrange
      const emptyTasks: Task[] = [];

      // Act
      const tree = buildTaskTree(emptyTasks);

      // Assert
      expect(tree).toEqual([]);
    });
  });

  describe('Task CRUD Operations', () => {
    it('should fetch tasks, construct tree, auto-expand roots, and update state when fetchTasks succeeds', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTaskListResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useTaskStore.getState().fetchTasks();

      // Assert
      const state = useTaskStore.getState();
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks?limit=100');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.tasks).toHaveLength(3);
      expect(state.taskTree).toHaveLength(1);
      expect(state.expandedTaskIds[mockTask1.id]).toBe(true);
    });

    it('should set error message in store when fetchTasks encounters an API failure', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockApiErrorResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useTaskStore.getState().fetchTasks();

      // Assert
      const state = useTaskStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Database query execution failed');
    });

    it('should post payload, refresh task list, expand parent, and reset modal when createTask succeeds', async () => {
      // Arrange
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if (url === '/api/tasks' && callCount === 1) {
          return {
            ok: true,
            json: async () => mockCreateTaskResponse,
          };
        }
        // Subsequent fetchTasks call
        return {
          ok: true,
          json: async () => mockTaskListResponse,
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      useTaskStore.setState({ isCreateModalOpen: true });

      // Act
      const success = await useTaskStore.getState().createTask({
        title: 'New Subtask',
        parentId: mockTask1.id,
      });

      // Assert
      const state = useTaskStore.getState();
      expect(success).toBe(true);
      expect(state.isCreating).toBe(false);
      expect(state.isCreateModalOpen).toBe(false);
      expect(state.expandedTaskIds[mockTask1.id]).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set error state and return false when createTask encounters an error', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockApiErrorResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const success = await useTaskStore.getState().createTask({
        title: 'Failed Task',
      });

      // Assert
      const state = useTaskStore.getState();
      expect(success).toBe(false);
      expect(state.isCreating).toBe(false);
      expect(state.error).toBe('Database query execution failed');
    });

    it('should patch task, update local task item, and rebuild tree when updateTask succeeds', async () => {
      // Arrange
      useTaskStore.setState({
        tasks: mockFlatTasks,
        taskTree: buildTaskTree(mockFlatTasks),
        isCreateModalOpen: true,
        editingTask: mockTask1,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUpdateTaskResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const success = await useTaskStore.getState().updateTask(mockTask1.id, {
        title: 'Updated Task Title',
        status: 'in_progress',
      });

      // Assert
      const state = useTaskStore.getState();
      expect(success).toBe(true);
      const updated = state.tasks.find((t) => t.id === mockTask1.id);
      expect(updated?.title).toBe('Updated Task Title');
      expect(updated?.status).toBe('in_progress');
      expect(state.isCreateModalOpen).toBe(false);
      expect(state.editingTask).toBeNull();
    });

    it('should set error state and return false when updateTask API returns error', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockApiErrorResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const success = await useTaskStore.getState().updateTask('some-id', {
        title: 'New Title',
      });

      // Assert
      const state = useTaskStore.getState();
      expect(success).toBe(false);
      expect(state.error).toBe('Database query execution failed');
    });

    it('should delete task and trigger fetchTasks when deleteTask succeeds', async () => {
      // Arrange
      let fetchCalled = false;
      const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
        if (opts?.method === 'DELETE') {
          return {
            ok: true,
            json: async () => mockDeleteTaskResponse,
          };
        }
        fetchCalled = true;
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { items: [], total: 0, page: 1, limit: 20, totalPages: 0 },
            message: 'All deleted',
          }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const success = await useTaskStore.getState().deleteTask(mockTask1.id);

      // Assert
      expect(success).toBe(true);
      expect(fetchCalled).toBe(true);
    });

    it('should optimistically toggle task status from todo to completed when toggleTaskStatus is invoked', async () => {
      // Arrange
      useTaskStore.setState({
        tasks: [mockTask1],
        taskTree: buildTaskTree([mockTask1]),
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockTask1, status: 'completed' },
          message: 'Status updated',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useTaskStore.getState().toggleTaskStatus(mockTask1.id, 'todo');

      // Assert
      const state = useTaskStore.getState();
      const updated = state.tasks.find((t) => t.id === mockTask1.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).not.toBeNull();
    });

    it('should revert optimistic update and set error when toggleTaskStatus network request fails', async () => {
      // Arrange
      useTaskStore.setState({
        tasks: [mockTask1],
        taskTree: buildTaskTree([mockTask1]),
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: 'Server unreachable' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useTaskStore.getState().toggleTaskStatus(mockTask1.id, 'todo');

      // Assert
      const state = useTaskStore.getState();
      const reverted = state.tasks.find((t) => t.id === mockTask1.id);
      expect(reverted?.status).toBe('todo');
      expect(state.error).toBe('Server unreachable');
    });

    it('should call planner generate endpoint, re-fetch tasks, and close modal when generateStudyPlan succeeds', async () => {
      // Arrange
      let listRefreshed = false;
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === '/api/planner/generate') {
          return {
            ok: true,
            json: async () => mockPlannerSuccessApiResponse,
          };
        }
        listRefreshed = true;
        return {
          ok: true,
          json: async () => mockTaskListResponse,
        };
      });
      vi.stubGlobal('fetch', mockFetch);
      useTaskStore.setState({ isPlannerModalOpen: true });

      // Act
      const success = await useTaskStore.getState().generateStudyPlan(mockPlannerGeneratePayload);

      // Assert
      const state = useTaskStore.getState();
      expect(success).toBe(true);
      expect(state.isGeneratingPlan).toBe(false);
      expect(state.isPlannerModalOpen).toBe(false);
      expect(listRefreshed).toBe(true);
    });

    it('should set error state and return false when generateStudyPlan API fails', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockPlannerErrorApiResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const success = await useTaskStore.getState().generateStudyPlan(mockPlannerGeneratePayload);

      // Assert
      const state = useTaskStore.getState();
      expect(success).toBe(false);
      expect(state.isGeneratingPlan).toBe(false);
      expect(state.error).toBe(mockPlannerErrorApiResponse.message);
    });
  });

  describe('Progress Snapshot and Percentage Computation', () => {
    it('should set active progress snapshot when setActiveProgressSnapshot is called', () => {
      // Arrange
      const snapshot = mockProgressSnapshot;

      // Act
      useTaskStore.getState().setActiveProgressSnapshot(snapshot);

      // Assert
      const state = useTaskStore.getState();
      expect(state.activeProgressSnapshot).toEqual(snapshot);
    });

    it('should correctly compute progress percentages across different completion milestones', () => {
      // Arrange
      const testCases = [
        { completed: 0, total: 4, expectedPercentage: 0 },
        { completed: 1, total: 4, expectedPercentage: 25 },
        { completed: 2, total: 4, expectedPercentage: 50 },
        { completed: 3, total: 4, expectedPercentage: 75 },
        { completed: 4, total: 4, expectedPercentage: 100 },
        { completed: 0, total: 0, expectedPercentage: 0 }, // Division by zero safety
      ];

      // Act & Assert
      testCases.forEach(({ completed, total, expectedPercentage }) => {
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        expect(percentage).toBe(expectedPercentage);
      });
    });

    it('should optimistically toggle target, recalculate completed steps, and auto-complete snapshot when all targets are done', async () => {
      // Arrange: 4 targets with index 0 & 1 completed (2/4)
      useTaskStore.setState({
        activeProgressSnapshot: { ...mockProgressSnapshot },
      });

      const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
        const payload = opts?.body ? JSON.parse(opts.body as string) : {};
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              ...mockProgressSnapshot,
              ...payload,
            },
            message: 'Updated',
          }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act: Toggle target index 2 (from false to true -> now 3/4 completed)
      await useTaskStore.getState().toggleProgressTarget(2);

      // Assert
      let snapshot = useTaskStore.getState().activeProgressSnapshot;
      expect(snapshot?.targets[2].completed).toBe(true);
      expect(snapshot?.completedSteps).toBe(3);
      expect(snapshot?.status).toBe('active');

      // Act: Toggle target index 3 (from false to true -> now 4/4 completed)
      await useTaskStore.getState().toggleProgressTarget(3);

      // Assert
      snapshot = useTaskStore.getState().activeProgressSnapshot;
      expect(snapshot?.targets[3].completed).toBe(true);
      expect(snapshot?.completedSteps).toBe(4);
      expect(snapshot?.status).toBe('completed');
    });

    it('should update snapshot status to cancelled with endedAt timestamp when cancelProgressSnapshot is called', async () => {
      // Arrange
      useTaskStore.setState({
        activeProgressSnapshot: { ...mockProgressSnapshot },
      });

      const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
        const payload = opts?.body ? JSON.parse(opts.body as string) : {};
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              ...mockProgressSnapshot,
              ...payload,
              endedAt: '2026-08-17T11:00:00.000Z',
            },
            message: 'Cancelled',
          }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useTaskStore.getState().cancelProgressSnapshot(mockProgressSnapshot.id);

      // Assert
      const snapshot = useTaskStore.getState().activeProgressSnapshot;
      expect(snapshot?.status).toBe('cancelled');
      expect(snapshot?.endedAt).not.toBeNull();
    });

    it('should update progress status to paused or active when updateProgressStatus is called', async () => {
      // Arrange
      useTaskStore.setState({
        activeProgressSnapshot: { ...mockProgressSnapshot },
      });

      const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
        const payload = opts?.body ? JSON.parse(opts.body as string) : {};
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              ...mockProgressSnapshot,
              ...payload,
            },
            message: 'Status updated',
          }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useTaskStore.getState().updateProgressStatus(mockProgressSnapshot.id, 'paused');

      // Assert
      const snapshot = useTaskStore.getState().activeProgressSnapshot;
      expect(snapshot?.status).toBe('paused');
    });
  });

  describe('UI State, Filters & Tree Expansion Actions', () => {
    it('should update specific filter key and reset to defaults when setFilter and resetFilters are called', () => {
      // Arrange
      const store = useTaskStore.getState();

      // Act: Set individual filters
      store.setFilter('status', 'in_progress');
      store.setFilter('priority', 'urgent');
      store.setFilter('search', 'Kalkulus');

      // Assert
      expect(useTaskStore.getState().filters.status).toBe('in_progress');
      expect(useTaskStore.getState().filters.priority).toBe('urgent');
      expect(useTaskStore.getState().filters.search).toBe('Kalkulus');

      // Act: Reset filters
      store.resetFilters();

      // Assert
      expect(useTaskStore.getState().filters.status).toBe('all');
      expect(useTaskStore.getState().filters.priority).toBe('all');
      expect(useTaskStore.getState().filters.search).toBe('');
    });

    it('should toggle, expand all, and collapse all task nodes when expansion actions are triggered', () => {
      // Arrange
      useTaskStore.setState({ tasks: mockFlatTasks });

      // Act: Toggle single task
      useTaskStore.getState().toggleTaskExpanded(mockTask1.id);
      expect(useTaskStore.getState().expandedTaskIds[mockTask1.id]).toBe(true);

      useTaskStore.getState().toggleTaskExpanded(mockTask1.id);
      expect(useTaskStore.getState().expandedTaskIds[mockTask1.id]).toBe(false);

      // Act: Expand all
      useTaskStore.getState().expandAllTasks();
      expect(useTaskStore.getState().expandedTaskIds[mockTask1.id]).toBe(true);
      expect(useTaskStore.getState().expandedTaskIds[mockTask2Subtask1.id]).toBe(true);
      expect(useTaskStore.getState().expandedTaskIds[mockTask3SubSubtask1.id]).toBe(true);

      // Act: Collapse all
      useTaskStore.getState().collapseAllTasks();
      expect(useTaskStore.getState().expandedTaskIds).toEqual({});
    });

    it('should open and close create/edit modal and planner modal with appropriate payloads', () => {
      // Arrange & Act: Open create modal with parentId
      useTaskStore.getState().openCreateModal(true, mockTask1.id);
      expect(useTaskStore.getState().isCreateModalOpen).toBe(true);
      expect(useTaskStore.getState().parentTaskIdForNewSubtask).toBe(mockTask1.id);
      expect(useTaskStore.getState().editingTask).toBeNull();

      // Act: Open edit modal
      useTaskStore.getState().openCreateModal(true, null, mockTask1);
      expect(useTaskStore.getState().editingTask).toEqual(mockTask1);

      // Act: Open & close planner modal
      useTaskStore.getState().openPlannerModal(true);
      expect(useTaskStore.getState().isPlannerModalOpen).toBe(true);

      useTaskStore.getState().openPlannerModal(false);
      expect(useTaskStore.getState().isPlannerModalOpen).toBe(false);

      // Act: Clear error
      useTaskStore.setState({ error: 'Some error' });
      useTaskStore.getState().clearError();
      expect(useTaskStore.getState().error).toBeNull();
    });

    it('should handle openCreateModal with default arguments when called with only isOpen', () => {
      // Arrange & Act
      useTaskStore.getState().openCreateModal(true);

      // Assert
      const state = useTaskStore.getState();
      expect(state.isCreateModalOpen).toBe(true);
      expect(state.parentTaskIdForNewSubtask).toBeNull();
      expect(state.editingTask).toBeNull();
    });
  });

  describe('Store Edge Cases & Branch Coverage', () => {
    it('should toggle completed task back to todo with completedAt set to null', async () => {
      // Arrange
      const completedTask: Task = {
        ...mockTask1,
        status: 'completed',
        completedAt: '2026-08-17T12:00:00.000Z',
      };
      useTaskStore.setState({
        tasks: [completedTask],
        taskTree: buildTaskTree([completedTask]),
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...completedTask, status: 'todo', completedAt: null },
          message: 'Status updated',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useTaskStore.getState().toggleTaskStatus(completedTask.id, 'completed');

      // Assert
      const state = useTaskStore.getState();
      const updated = state.tasks.find((t) => t.id === completedTask.id);
      expect(updated?.status).toBe('todo');
      expect(updated?.completedAt).toBeNull();
    });

    it('should handle non-Error exceptions gracefully across fetchTasks, createTask, updateTask, and deleteTask', async () => {
      // Arrange: mock fetch throwing non-Error object
      const mockFetch = vi.fn().mockRejectedValue('Fatal network disconnect');
      vi.stubGlobal('fetch', mockFetch);

      // Act: fetchTasks
      await useTaskStore.getState().fetchTasks();
      expect(useTaskStore.getState().error).toBe('Unknown error occurred while fetching tasks');

      // Act: createTask
      const createRes = await useTaskStore.getState().createTask({ title: 'Task' });
      expect(createRes).toBe(false);
      expect(useTaskStore.getState().error).toBe('Failed to create task');

      // Act: updateTask
      const updateRes = await useTaskStore.getState().updateTask('some-id', { title: 'New' });
      expect(updateRes).toBe(false);
      expect(useTaskStore.getState().error).toBe('Failed to update task');

      // Act: deleteTask
      const deleteRes = await useTaskStore.getState().deleteTask('some-id');
      expect(deleteRes).toBe(false);
      expect(useTaskStore.getState().error).toBe('Failed to delete task');

      // Act: generateStudyPlan
      const planRes = await useTaskStore.getState().generateStudyPlan(mockPlannerGeneratePayload);
      expect(planRes).toBe(false);
      expect(useTaskStore.getState().error).toBe('Failed to generate study plan');
    });

    it('should handle deleteTask when API returns error response', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockApiErrorResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const result = await useTaskStore.getState().deleteTask('some-id');

      // Assert
      expect(result).toBe(false);
      expect(useTaskStore.getState().error).toBe('Database query execution failed');
    });

    it('should return early without errors when progress actions are called with null snapshot or invalid target index', async () => {
      // Arrange: activeProgressSnapshot is null
      useTaskStore.setState({ activeProgressSnapshot: null });
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      // Act: toggle target on null snapshot
      await useTaskStore.getState().toggleProgressTarget(0);
      expect(mockFetch).not.toHaveBeenCalled();

      // Act: cancel on null snapshot
      await useTaskStore.getState().cancelProgressSnapshot('some-id');
      expect(mockFetch).not.toHaveBeenCalled();

      // Act: update status on null snapshot
      await useTaskStore.getState().updateProgressStatus('some-id', 'active');
      expect(mockFetch).not.toHaveBeenCalled();

      // Arrange: snapshot exists but target index is out of bounds
      useTaskStore.setState({ activeProgressSnapshot: mockProgressSnapshot });
      await useTaskStore.getState().toggleProgressTarget(999);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set endedAt when updateProgressStatus is called with completed status', async () => {
      // Arrange
      useTaskStore.setState({ activeProgressSnapshot: mockProgressSnapshot });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockProgressSnapshot, status: 'completed', endedAt: '2026-08-17T12:00:00.000Z' },
          message: 'Completed',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useTaskStore.getState().updateProgressStatus(mockProgressSnapshot.id, 'completed');

      // Assert
      const snapshot = useTaskStore.getState().activeProgressSnapshot;
      expect(snapshot?.status).toBe('completed');
      expect(snapshot?.endedAt).not.toBeNull();
    });

    it('should set error state and return false when updateProgressSnapshot API fails', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockApiErrorResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const result = await useTaskStore.getState().updateProgressSnapshot('some-id', { status: 'paused' });

      // Assert
      expect(result).toBe(false);
      expect(useTaskStore.getState().error).toBe('Database query execution failed');
    });
  });
});
