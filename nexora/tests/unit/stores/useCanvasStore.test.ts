import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useCanvasStore } from '@/stores/useCanvasStore';
import {
  mockCanvasId,
  mockCanvasGraph,
  mockCanvasNodes,
  mockCanvasEdges,
  mockVariables,
  mockProblemRootNode,
  mockReasoningStepNode,
  mockEvaluationApiResponse,
  mockBranchSuggestions,
  mockBranchSuggestionsApiResponse,
} from '../../mocks/canvasMocks';
import type { CanvasVariable, StemCanvasNode, StemCanvasEdge } from '@/types/canvas';

describe('useCanvasStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset Zustand store state before each test
    useCanvasStore.setState({
      canvasId: null,
      title: 'Untitled STEM Canvas',
      description: null,
      category: 'Calculus & Algebra',
      viewport: { x: 0, y: 0, zoom: 1 },
      globalVariables: [],
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isVariableSidebarOpen: false,
      isBranchModalOpen: false,
      isEvaluating: false,
      isSuggestingBranches: false,
      isSaving: false,
      lastSavedAt: null,
      error: null,
      evaluationResult: null,
      branchSuggestions: [],
      history: {
        past: [],
        future: [],
      },
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('Canvas Loading & Metadata', () => {
    it('should fetch and load canvas graph into store when loadCanvas succeeds', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCanvasGraph,
          message: 'Canvas loaded',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const result = await useCanvasStore.getState().loadCanvas(mockCanvasId);

      // Assert
      const state = useCanvasStore.getState();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(`/api/canvas/${mockCanvasId}`);
      expect(state.canvasId).toBe(mockCanvasId);
      expect(state.title).toBe(mockCanvasGraph.title);
      expect(state.nodes).toHaveLength(mockCanvasNodes.length);
      expect(state.edges).toHaveLength(mockCanvasEdges.length);
      expect(state.globalVariables).toHaveLength(mockVariables.length);
      expect(state.isSaving).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error state and return false when loadCanvas API fails', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          data: null,
          message: 'Canvas not found',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const result = await useCanvasStore.getState().loadCanvas('invalid-id');

      // Assert
      const state = useCanvasStore.getState();
      expect(result).toBe(false);
      expect(state.error).toBe('Canvas not found');
    });

    it('should update metadata and trigger saveGraph when setCanvasMeta is called', () => {
      // Arrange
      const store = useCanvasStore.getState();
      useCanvasStore.setState({ canvasId: mockCanvasId });

      // Act
      store.setCanvasMeta('Persamaan Maxwell & Elektromagnetik', 'Analisis divergensi dan curl', 'Fisika');

      // Assert
      const state = useCanvasStore.getState();
      expect(state.title).toBe('Persamaan Maxwell & Elektromagnetik');
      expect(state.description).toBe('Analisis divergensi dan curl');
      expect(state.category).toBe('Fisika');
    });
  });

  describe('Node & Edge CRUD Operations', () => {
    it('should create node, push history snapshot, select node, and trigger save when addNode is called', () => {
      // Arrange
      useCanvasStore.setState({ canvasId: mockCanvasId });

      // Act
      const newNode = useCanvasStore.getState().addNode('reasoning_step', { x: 200, y: 300 }, {
        title: 'Penurunan Energi Kinetik',
        latexFormula: 'E_k = \\frac{1}{2} m v^2',
      });

      // Assert
      const state = useCanvasStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe(newNode.id);
      expect(state.nodes[0].data.title).toBe('Penurunan Energi Kinetik');
      expect(state.nodes[0].data.latexFormula).toBe('E_k = \\frac{1}{2} m v^2');
      expect(state.selectedNodeId).toBe(newNode.id);
      expect(state.history.past).toHaveLength(1);
    });

    it('should update node data fields and preserve other properties when updateNodeData is called', () => {
      // Arrange
      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockProblemRootNode],
      });

      // Act
      useCanvasStore.getState().updateNodeData(mockProblemRootNode.id, {
        title: 'Updated Root Problem',
        validationStatus: 'valid',
      });

      // Assert
      const updatedNode = useCanvasStore.getState().nodes.find((n) => n.id === mockProblemRootNode.id);
      expect(updatedNode?.data.title).toBe('Updated Root Problem');
      expect(updatedNode?.data.validationStatus).toBe('valid');
      expect(updatedNode?.data.latexFormula).toBe(mockProblemRootNode.data.latexFormula);
    });

    it('should delete target node and cascade delete all connected edges when deleteNode is called', () => {
      // Arrange
      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockProblemRootNode, mockReasoningStepNode],
        edges: [
          {
            id: 'edge-1',
            source: mockProblemRootNode.id,
            target: mockReasoningStepNode.id,
            type: 'implication',
          },
        ],
        selectedNodeId: mockProblemRootNode.id,
      });

      // Act
      useCanvasStore.getState().deleteNode(mockProblemRootNode.id);

      // Assert
      const state = useCanvasStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe(mockReasoningStepNode.id);
      expect(state.edges).toHaveLength(0); // Cascade deleted
      expect(state.selectedNodeId).toBeNull();
      expect(state.history.past).toHaveLength(1);
    });

    it('should delete target edge and clear selectedEdgeId when deleteEdge is called', () => {
      // Arrange
      const testEdge: StemCanvasEdge = {
        id: 'edge-test-1',
        source: 'node-1',
        target: 'node-2',
        type: 'implication',
      };
      useCanvasStore.setState({
        canvasId: mockCanvasId,
        edges: [testEdge],
        selectedEdgeId: testEdge.id,
      });

      // Act
      useCanvasStore.getState().deleteEdge(testEdge.id);

      // Assert
      const state = useCanvasStore.getState();
      expect(state.edges).toHaveLength(0);
      expect(state.selectedEdgeId).toBeNull();
      expect(state.history.past).toHaveLength(1);
    });

    it('should toggle isCollapsed boolean state on target node when toggleNodeCollapse is called', () => {
      // Arrange
      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [{ ...mockReasoningStepNode, data: { ...mockReasoningStepNode.data, isCollapsed: false } }],
      });

      // Act: Collapse
      useCanvasStore.getState().toggleNodeCollapse(mockReasoningStepNode.id);
      expect(useCanvasStore.getState().nodes[0].data.isCollapsed).toBe(true);

      // Act: Expand
      useCanvasStore.getState().toggleNodeCollapse(mockReasoningStepNode.id);
      expect(useCanvasStore.getState().nodes[0].data.isCollapsed).toBe(false);
    });

    it('should manage mutual exclusive selection for selectNode and selectEdge', () => {
      // Arrange & Act: Select node
      useCanvasStore.getState().selectNode('node-1');
      expect(useCanvasStore.getState().selectedNodeId).toBe('node-1');
      expect(useCanvasStore.getState().selectedEdgeId).toBeNull();

      // Act: Select edge
      useCanvasStore.getState().selectEdge('edge-1');
      expect(useCanvasStore.getState().selectedEdgeId).toBe('edge-1');
      expect(useCanvasStore.getState().selectedNodeId).toBeNull();
    });

    it('should add connecting edge and push history snapshot when onConnect is invoked', () => {
      // Arrange
      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockProblemRootNode, mockReasoningStepNode],
        edges: [],
      });

      // Act
      useCanvasStore.getState().onConnect({
        source: mockProblemRootNode.id,
        target: mockReasoningStepNode.id,
        sourceHandle: null,
        targetHandle: null,
      });

      // Assert
      const state = useCanvasStore.getState();
      expect(state.edges).toHaveLength(1);
      expect(state.edges[0].source).toBe(mockProblemRootNode.id);
      expect(state.edges[0].target).toBe(mockReasoningStepNode.id);
      expect(state.edges[0].type).toBe('implication');
      expect(state.history.past).toHaveLength(1);
    });
  });

  describe('Variable Slider Reactivity & Propagation', () => {
    it('should update variable value in globalVariables and propagate to referencing node local variables', () => {
      // Arrange: Node referencing var-v0
      const nodeWithVar: StemCanvasNode = {
        ...mockReasoningStepNode,
        data: {
          ...mockReasoningStepNode.data,
          variables: [mockVariables[0], mockVariables[1]],
        },
      };

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        globalVariables: mockVariables,
        nodes: [nodeWithVar],
      });

      // Act: Update velocity v_0 from 20 to 35
      useCanvasStore.getState().updateVariable('var-v0', 35);

      // Assert: Global variable updated
      const state = useCanvasStore.getState();
      const updatedGlobal = state.globalVariables.find((v) => v.id === 'var-v0');
      expect(updatedGlobal?.value).toBe(35);

      // Assert: Node local variable updated reactively
      const updatedNode = state.nodes[0];
      const nodeVar = updatedNode.data.variables?.find((v) => v.id === 'var-v0');
      expect(nodeVar?.value).toBe(35);

      // Unrelated variable unaffected
      const thetaVar = updatedNode.data.variables?.find((v) => v.id === 'var-theta');
      expect(thetaVar?.value).toBe(45);
    });

    it('should add new variable or replace existing variable when addGlobalVariable is called', () => {
      // Arrange
      const newVar: CanvasVariable = {
        id: 'var-mass',
        name: 'm',
        symbol: 'm',
        label: 'Mass',
        value: 10,
        defaultValue: 10,
        min: 0.1,
        max: 50,
        step: 0.1,
        unit: 'kg',
        isIndependent: true,
      };

      // Act
      useCanvasStore.getState().addGlobalVariable(newVar);

      // Assert
      const state = useCanvasStore.getState();
      expect(state.globalVariables).toContainEqual(newVar);
    });

    it('should remove variable from globalVariables when deleteGlobalVariable is called', () => {
      // Arrange
      useCanvasStore.setState({
        canvasId: mockCanvasId,
        globalVariables: mockVariables,
      });

      // Act
      useCanvasStore.getState().deleteGlobalVariable('var-v0');

      // Assert
      const state = useCanvasStore.getState();
      expect(state.globalVariables.find((v) => v.id === 'var-v0')).toBeUndefined();
      expect(state.globalVariables).toHaveLength(mockVariables.length - 1);
    });
  });

  describe('Undo / Redo History Stack (Max 20 Limit)', () => {
    it('should push snapshots to past history and maintain maximum 20 snapshots cap', () => {
      // Arrange
      useCanvasStore.setState({ canvasId: mockCanvasId });

      // Act: Push 25 snapshots sequentially
      for (let i = 1; i <= 25; i++) {
        useCanvasStore.setState({
          nodes: [
            {
              id: `node-${i}`,
              type: 'reasoning_step',
              position: { x: i * 10, y: i * 10 },
              data: { title: `Step ${i}`, nodeType: 'reasoning_step', validationStatus: 'tentative' },
            },
          ],
        });
        useCanvasStore.getState().pushHistorySnapshot();
      }

      // Assert: Past history is capped at max 20
      const state = useCanvasStore.getState();
      expect(state.history.past.length).toBeLessThanOrEqual(20);
    });

    it('should undo previous changes, restore node/edge states, and push to future stack', () => {
      // Arrange
      const nodeA: StemCanvasNode = { ...mockProblemRootNode, id: 'node-A' };
      const nodeB: StemCanvasNode = { ...mockReasoningStepNode, id: 'node-B' };

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [nodeA],
        edges: [],
        history: { past: [], future: [] },
      });

      // User adds nodeB
      useCanvasStore.getState().pushHistorySnapshot();
      useCanvasStore.setState({
        nodes: [nodeA, nodeB],
      });

      // Act: Undo
      useCanvasStore.getState().undo();

      // Assert: Restored nodeA only
      const state = useCanvasStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe('node-A');
      expect(state.history.future).toHaveLength(1);
    });

    it('should redo undone changes, restore next state, and push to past stack', () => {
      // Arrange
      const nodeA: StemCanvasNode = { ...mockProblemRootNode, id: 'node-A' };
      const nodeB: StemCanvasNode = { ...mockReasoningStepNode, id: 'node-B' };

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [nodeA],
        edges: [],
        history: { past: [], future: [] },
      });

      useCanvasStore.getState().pushHistorySnapshot();
      useCanvasStore.setState({ nodes: [nodeA, nodeB] });

      // Undo -> Back to [nodeA]
      useCanvasStore.getState().undo();
      expect(useCanvasStore.getState().nodes).toHaveLength(1);

      // Act: Redo
      useCanvasStore.getState().redo();

      // Assert: Restored [nodeA, nodeB]
      const state = useCanvasStore.getState();
      expect(state.nodes).toHaveLength(2);
      expect(state.history.future).toHaveLength(0);
      expect(state.history.past).toHaveLength(1);
    });

    it('should do nothing gracefully when undo is called on empty past or redo on empty future', () => {
      // Arrange
      useCanvasStore.setState({
        nodes: [mockProblemRootNode],
        history: { past: [], future: [] },
      });

      // Act
      useCanvasStore.getState().undo();
      useCanvasStore.getState().redo();

      // Assert
      expect(useCanvasStore.getState().nodes).toHaveLength(1);
    });
  });

  describe('Debounced Save Graph Triggers', () => {
    it('should execute saveGraph immediately when immediate=true is passed', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Saved' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockProblemRootNode],
        edges: [],
      });

      // Act
      const result = await useCanvasStore.getState().saveGraph(true);

      // Assert
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/canvas/${mockCanvasId}/graph`,
        expect.objectContaining({ method: 'PUT' })
      );
      expect(useCanvasStore.getState().lastSavedAt).not.toBeNull();
    });

    it('should debounce saveGraph execution when immediate is false', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Saved' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockProblemRootNode],
      });

      // Act: Call debounced save
      useCanvasStore.getState().saveGraph(false);

      // Assert: Before timer runs, fetch not yet called
      expect(mockFetch).not.toHaveBeenCalled();

      // Fast-forward timers past debounce delay (1500ms)
      await vi.advanceTimersByTimeAsync(1600);

      // Assert: Fetch called after debounce
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return false without throwing when saveGraph has no canvasId', async () => {
      // Arrange
      useCanvasStore.setState({ canvasId: null });

      // Act
      const result = await useCanvasStore.getState().saveGraph(true);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('AI Evaluation & Branch Suggestion Actions', () => {
    it('should post evaluation payload, update node validationStatus, and set evaluationResult on success', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockEvaluationApiResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockReasoningStepNode],
        globalVariables: mockVariables,
      });

      // Act
      const result = await useCanvasStore.getState().evaluateNode(mockReasoningStepNode.id);

      // Assert
      const state = useCanvasStore.getState();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/canvas/${mockCanvasId}/evaluate`,
        expect.objectContaining({ method: 'POST' })
      );
      expect(state.evaluationResult?.isValid).toBe(true);
      expect(state.evaluationResult?.validationStatus).toBe('valid');
      expect(state.isEvaluating).toBe(false);
    });

    it('should post suggest-branch payload, update branchSuggestions, and open modal on success', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBranchSuggestionsApiResponse,
      });
      vi.stubGlobal('fetch', mockFetch);

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockReasoningStepNode],
        globalVariables: mockVariables,
      });

      // Act
      const result = await useCanvasStore.getState().suggestBranches(mockReasoningStepNode.id, 2);

      // Assert
      const state = useCanvasStore.getState();
      expect(result).toBe(true);
      expect(state.branchSuggestions).toHaveLength(2);
      expect(state.isBranchModalOpen).toBe(true);
      expect(state.isSuggestingBranches).toBe(false);
    });

    it('should return false when evaluateNode is called with non-existent nodeId or null canvasId', async () => {
      // Arrange: Null canvasId
      useCanvasStore.setState({ canvasId: null, nodes: [mockReasoningStepNode] });
      const resultNullCanvas = await useCanvasStore.getState().evaluateNode(mockReasoningStepNode.id);
      expect(resultNullCanvas).toBe(false);

      // Arrange: Non-existent node
      useCanvasStore.setState({ canvasId: mockCanvasId, nodes: [] });
      const resultMissingNode = await useCanvasStore.getState().evaluateNode('non-existent-node');
      expect(resultMissingNode).toBe(false);
    });

    it('should set error state and return false when evaluateNode API returns failure or throws', async () => {
      // Arrange: API failure response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: 'Invalid mathematical expression' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockReasoningStepNode],
      });

      // Act
      const result = await useCanvasStore.getState().evaluateNode(mockReasoningStepNode.id);

      // Assert
      expect(result).toBe(false);
      expect(useCanvasStore.getState().error).toBe('Invalid mathematical expression');
      expect(useCanvasStore.getState().isEvaluating).toBe(false);

      // Arrange: Network exception
      const mockFetchThrow = vi.fn().mockRejectedValue(new Error('Network offline'));
      vi.stubGlobal('fetch', mockFetchThrow);

      // Act
      const resultThrow = await useCanvasStore.getState().evaluateNode(mockReasoningStepNode.id);
      expect(resultThrow).toBe(false);
      expect(useCanvasStore.getState().error).toBe('Network offline');
    });

    it('should return false when suggestBranches is called with non-existent nodeId or null canvasId', async () => {
      // Arrange: Null canvasId
      useCanvasStore.setState({ canvasId: null, nodes: [mockReasoningStepNode] });
      const resultNullCanvas = await useCanvasStore.getState().suggestBranches(mockReasoningStepNode.id);
      expect(resultNullCanvas).toBe(false);

      // Arrange: Non-existent node
      useCanvasStore.setState({ canvasId: mockCanvasId, nodes: [] });
      const resultMissingNode = await useCanvasStore.getState().suggestBranches('non-existent-node');
      expect(resultMissingNode).toBe(false);
    });

    it('should set error state and return false when suggestBranches API returns failure or throws', async () => {
      // Arrange: API failure response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: 'Rate limit exceeded' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockReasoningStepNode],
      });

      // Act
      const result = await useCanvasStore.getState().suggestBranches(mockReasoningStepNode.id);

      // Assert
      expect(result).toBe(false);
      expect(useCanvasStore.getState().error).toBe('Rate limit exceeded');
      expect(useCanvasStore.getState().isSuggestingBranches).toBe(false);

      // Arrange: Network exception
      const mockFetchThrow = vi.fn().mockRejectedValue(new Error('Connection reset'));
      vi.stubGlobal('fetch', mockFetchThrow);

      // Act
      const resultThrow = await useCanvasStore.getState().suggestBranches(mockReasoningStepNode.id);
      expect(resultThrow).toBe(false);
      expect(useCanvasStore.getState().error).toBe('Connection reset');
    });

    it('should do nothing gracefully when applyBranchSuggestion is called with missing sourceNode', () => {
      // Arrange: Empty nodes
      useCanvasStore.setState({ canvasId: mockCanvasId, nodes: [] });

      // Act
      useCanvasStore.getState().applyBranchSuggestion(mockBranchSuggestions[0], 'missing-source-node');

      // Assert
      expect(useCanvasStore.getState().nodes).toHaveLength(0);
      expect(useCanvasStore.getState().edges).toHaveLength(0);
    });

    it('should apply selected branch suggestion by adding child node and connecting edge', () => {
      // Arrange
      useCanvasStore.setState({
        canvasId: mockCanvasId,
        nodes: [mockReasoningStepNode],
        edges: [],
        isBranchModalOpen: true,
      });

      const suggestion = mockBranchSuggestions[0];

      // Act
      useCanvasStore.getState().applyBranchSuggestion(suggestion, mockReasoningStepNode.id);

      // Assert
      const state = useCanvasStore.getState();
      expect(state.nodes).toHaveLength(2); // original + new suggested node
      expect(state.edges).toHaveLength(1); // connecting edge
      expect(state.edges[0].source).toBe(mockReasoningStepNode.id);
      expect(state.isBranchModalOpen).toBe(false);
    });
  });

  describe('UI Controls & Dialog States', () => {
    it('should open and close variable sidebar and branch suggestion modal', () => {
      // Arrange & Act
      useCanvasStore.getState().setVariableSidebarOpen(true);
      expect(useCanvasStore.getState().isVariableSidebarOpen).toBe(true);

      useCanvasStore.getState().setBranchModalOpen(true);
      expect(useCanvasStore.getState().isBranchModalOpen).toBe(true);

      useCanvasStore.getState().setVariableSidebarOpen(false);
      expect(useCanvasStore.getState().isVariableSidebarOpen).toBe(false);
    });

    it('should update viewport state when setViewport is called', () => {
      // Arrange
      const newViewport = { x: 50, y: -80, zoom: 1.5 };

      // Act
      useCanvasStore.getState().setViewport(newViewport);

      // Assert
      expect(useCanvasStore.getState().viewport).toEqual(newViewport);
    });

    it('should clear error state when clearError is called', () => {
      // Arrange
      useCanvasStore.setState({ error: 'Network error occurred' });

      // Act
      useCanvasStore.getState().clearError();

      // Assert
      expect(useCanvasStore.getState().error).toBeNull();
    });
  });
});
