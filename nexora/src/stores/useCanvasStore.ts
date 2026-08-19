import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Viewport,
  type Connection,
} from '@xyflow/react';
import type {
  StemCanvasNode,
  StemCanvasEdge,
  CanvasNodeType,
  CanvasNodeData,
  CanvasVariable,
  CanvasGraph,
  NodeEvaluationResult,
  SuggestedBranchItem,
  ApiResponse,
} from '@/types/canvas';

interface HistoryState {
  nodes: StemCanvasNode[];
  edges: StemCanvasEdge[];
}

export interface CanvasState {
  // Canvas metadata
  canvasId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  viewport: Viewport;
  globalVariables: CanvasVariable[];

  // Graph Data
  nodes: StemCanvasNode[];
  edges: StemCanvasEdge[];

  // Selection & UI state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isVariableSidebarOpen: boolean;
  isBranchModalOpen: boolean;
  isEvaluating: boolean;
  isSuggestingBranches: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  error: string | null;

  // AI Evaluation & Suggestions
  evaluationResult: NodeEvaluationResult | null;
  branchSuggestions: SuggestedBranchItem[];

  // Task Conversion & Linked Tasks
  linkedTasks: Record<string, string>; // maps nodeId -> taskId
  isNodeToTaskModalOpen: boolean;
  convertingNodeId: string | null;
  isConvertingNodeToTask: boolean;

  // Undo / Redo History
  history: {
    past: HistoryState[];
    future: HistoryState[];
  };

  // Actions
  loadCanvas: (id: string) => Promise<boolean>;
  fetchLinkedTasks: (canvasId: string) => Promise<void>;
  openNodeToTaskModal: (nodeId: string) => void;
  closeNodeToTaskModal: () => void;
  convertNodeToTask: (
    canvasId: string,
    nodeId: string,
    payload?: import('@/lib/validators/canvas-task').NodeToTaskConvert
  ) => Promise<import('@/types/task').Task | null>;

  setCanvasMeta: (title: string, description?: string | null, category?: string | null) => void;
  setNodes: (nodes: StemCanvasNode[]) => void;
  setEdges: (edges: StemCanvasEdge[]) => void;
  onNodesChange: OnNodesChange<StemCanvasNode>;
  onEdgesChange: OnEdgesChange<StemCanvasEdge>;
  onConnect: OnConnect;

  // Node & Edge CRUD
  addNode: (
    nodeType: CanvasNodeType,
    position?: { x: number; y: number },
    initialData?: Partial<CanvasNodeData>
  ) => StemCanvasNode;
  updateNodeData: (nodeId: string, data: Partial<CanvasNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;

  // Variable Management
  updateVariable: (varId: string, value: number) => void;
  addGlobalVariable: (variable: CanvasVariable) => void;
  deleteGlobalVariable: (varId: string) => void;

  // AI Actions
  evaluateNode: (nodeId: string) => Promise<boolean>;
  suggestBranches: (nodeId: string, count?: number) => Promise<boolean>;
  applyBranchSuggestion: (suggestion: SuggestedBranchItem, sourceNodeId: string) => void;

  // Persistence & Auto-Save
  saveGraph: (immediate?: boolean) => Promise<boolean>;
  setViewport: (viewport: Viewport) => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  pushHistorySnapshot: () => void;

  // UI Dialog Controls
  setVariableSidebarOpen: (isOpen: boolean) => void;
  setBranchModalOpen: (isOpen: boolean) => void;
  clearError: () => void;
}

let autoSaveTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_DELAY_MS = 1500;

export const useCanvasStore = create<CanvasState>((set, get) => ({
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

  linkedTasks: {},
  isNodeToTaskModalOpen: false,
  convertingNodeId: null,
  isConvertingNodeToTask: false,

  history: {
    past: [],
    future: [],
  },

  loadCanvas: async (id: string) => {
    set({ isSaving: true, error: null, canvasId: id });
    try {
      const response = await fetch(`/api/canvas/${id}`);
      const json: ApiResponse<CanvasGraph> = await response.json();

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Failed to load canvas');
      }

      const canvas = json.data;

      set({
        canvasId: canvas.id,
        title: canvas.title,
        description: canvas.description,
        category: canvas.category,
        viewport: canvas.viewport || { x: 0, y: 0, zoom: 1 },
        globalVariables: canvas.globalVariables || [],
        nodes: canvas.nodes || [],
        edges: canvas.edges || [],
        isSaving: false,
        lastSavedAt: new Date(canvas.updatedAt),
        history: { past: [], future: [] },
      });

      // Load existing task linkages
      get().fetchLinkedTasks(canvas.id);

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load canvas graph';
      set({ error: msg, isSaving: false });
      return false;
    }
  },

  setCanvasMeta: (title, description = null, category = null) => {
    set({ title, description, category });
    get().saveGraph();
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
    get().saveGraph();
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
    get().saveGraph();
  },

  onConnect: (connection: Connection) => {
    get().pushHistorySnapshot();
    const newEdge: StemCanvasEdge = {
      id: `edge-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      type: 'implication',
      data: {
        edgeType: 'implication',
        label: 'implication',
      },
    };

    set({
      edges: addEdge(newEdge, get().edges) as StemCanvasEdge[],
    });

    get().saveGraph();
  },

  addNode: (nodeType, position, initialData = {}) => {
    get().pushHistorySnapshot();
    const id = `${nodeType}-${Date.now()}`;

    // Default node titles based on type
    const defaultTitles: Record<CanvasNodeType, string> = {
      problem_root: 'Problem Statement & Target',
      reasoning_step: 'Logical Derivation Step',
      what_if_branch: 'What-If Simulation Scenario',
      theorem_proof: 'Theorem & Axiom Applicability',
      formula_block: 'Interactive Formula Block',
    };

    const nodePos = position || {
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
    };

    const newNode: StemCanvasNode = {
      id,
      type: nodeType,
      position: nodePos,
      data: {
        title: initialData.title || defaultTitles[nodeType],
        nodeType,
        validationStatus: initialData.validationStatus || 'tentative',
        isCollapsed: false,
        content: initialData.content || '',
        latexFormula: initialData.latexFormula || '',
        variables: initialData.variables || [],
        customData: initialData.customData || {},
        ...initialData,
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
    }));

    get().saveGraph();
    return newNode;
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          : node
      ),
    }));
    get().saveGraph();
  },

  deleteNode: (nodeId) => {
    get().pushHistorySnapshot();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
    get().saveGraph();
  },

  deleteEdge: (edgeId) => {
    get().pushHistorySnapshot();
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
    }));
    get().saveGraph();
  },

  toggleNodeCollapse: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                isCollapsed: !node.data.isCollapsed,
              },
            }
          : node
      ),
    }));
    get().saveGraph();
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  updateVariable: (varId, value) => {
    set((state) => {
      // 1. Update in globalVariables list
      const updatedGlobal = state.globalVariables.map((v) =>
        v.id === varId ? { ...v, value } : v
      );

      // 2. Propagate to node local variables & what_if delta sliders
      const updatedNodes = state.nodes.map((node) => {
        let nodeUpdated = false;
        let nextVariables = node.data.variables;

        if (nextVariables && nextVariables.some((v) => v.id === varId)) {
          nextVariables = nextVariables.map((v) => (v.id === varId ? { ...v, value } : v));
          nodeUpdated = true;
        }

        return nodeUpdated
          ? {
              ...node,
              data: {
                ...node.data,
                variables: nextVariables,
              },
            }
          : node;
      });

      return {
        globalVariables: updatedGlobal,
        nodes: updatedNodes,
      };
    });

    get().saveGraph();
  },

  addGlobalVariable: (variable) => {
    set((state) => ({
      globalVariables: [...state.globalVariables.filter((v) => v.id !== variable.id), variable],
    }));
    get().saveGraph();
  },

  deleteGlobalVariable: (varId) => {
    set((state) => ({
      globalVariables: state.globalVariables.filter((v) => v.id !== varId),
    }));
    get().saveGraph();
  },

  evaluateNode: async (nodeId) => {
    const canvasId = get().canvasId;
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!canvasId || !node) return false;

    set({ isEvaluating: true, error: null });

    // Collect parent node formula context
    const incomingEdge = get().edges.find((e) => e.target === nodeId);
    const parentNode = incomingEdge
      ? get().nodes.find((n) => n.id === incomingEdge.source)
      : undefined;

    const payload = {
      nodeId,
      stepTitle: node.data.title,
      stepFormula: node.data.latexFormula || '',
      explanation: node.data.content || '',
      appliedRule: (node.data.customData as Record<string, unknown>)?.appliedRule as string | undefined,
      priorStepFormula: parentNode?.data.latexFormula,
      variables: get().globalVariables,
    };

    try {
      const response = await fetch(`/api/canvas/${canvasId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<NodeEvaluationResult> = await response.json();

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Math evaluation failed');
      }

      const evaluation = json.data;

      // Update node validation status in store
      get().updateNodeData(nodeId, {
        validationStatus: evaluation.validationStatus,
      });

      set({
        evaluationResult: evaluation,
        isEvaluating: false,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Evaluation failed';
      set({ error: msg, isEvaluating: false });
      return false;
    }
  },

  suggestBranches: async (nodeId, count = 3) => {
    const canvasId = get().canvasId;
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!canvasId || !node) return false;

    set({ isSuggestingBranches: true, error: null, branchSuggestions: [] });

    const payload = {
      targetNodeId: nodeId,
      branchType: 'what_if_simulation' as const,
      desiredBranchesCount: count,
      variablesContext: get().globalVariables,
    };

    try {
      const response = await fetch(`/api/canvas/${canvasId}/suggest-branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<{ targetNodeId: string; suggestions: SuggestedBranchItem[] }> =
        await response.json();

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Failed to generate branch suggestions');
      }

      set({
        branchSuggestions: json.data.suggestions || [],
        isSuggestingBranches: false,
        isBranchModalOpen: true,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Branch suggestion failed';
      set({ error: msg, isSuggestingBranches: false });
      return false;
    }
  },

  applyBranchSuggestion: (suggestion, sourceNodeId) => {
    const sourceNode = get().nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    get().pushHistorySnapshot();

    const targetPos = {
      x: sourceNode.position.x + (suggestion.positionOffset?.x || 280),
      y: sourceNode.position.y + (suggestion.positionOffset?.y || 80),
    };

    const newNode = get().addNode(suggestion.suggestedNodeType || 'what_if_branch', targetPos, {
      title: suggestion.title,
      content: suggestion.description,
      latexFormula: suggestion.latexFormula,
      variables: suggestion.variables,
      validationStatus: 'tentative',
    });

    // Create edge connecting sourceNode to newNode
    const newEdge: StemCanvasEdge = {
      id: `edge-${Date.now()}`,
      source: sourceNodeId,
      target: newNode.id,
      type: suggestion.suggestedEdgeType || 'implication',
      data: {
        edgeType: suggestion.suggestedEdgeType || 'implication',
        label: suggestion.justification || suggestion.branchType,
      },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
      isBranchModalOpen: false,
    }));

    get().saveGraph();
  },

  saveGraph: async (immediate = false) => {
    const canvasId = get().canvasId;
    if (!canvasId) return false;

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const executeSave = async () => {
      set({ isSaving: true, error: null });

      const payload = {
        nodes: get().nodes,
        edges: get().edges,
        viewport: get().viewport,
        globalVariables: get().globalVariables,
      };

      try {
        const response = await fetch(`/api/canvas/${canvasId}/graph`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json: ApiResponse<unknown> = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.message || 'Auto-save failed');
        }

        set({ isSaving: false, lastSavedAt: new Date() });
        return true;
      } catch (err) {
        console.warn('Canvas auto-save error:', err);
        set({ isSaving: false });
        return false;
      }
    };

    if (immediate) {
      return await executeSave();
    } else {
      autoSaveTimeout = setTimeout(executeSave, DEBOUNCE_DELAY_MS);
      return true;
    }
  },

  setViewport: (viewport) => {
    set({ viewport });
    get().saveGraph();
  },

  pushHistorySnapshot: () => {
    const currentState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(get().nodes)),
      edges: JSON.parse(JSON.stringify(get().edges)),
    };

    set((state) => ({
      history: {
        past: [...state.history.past.slice(-19), currentState],
        future: [],
      },
    }));
  },

  undo: () => {
    const { past, future } = get().history;
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    const currentSnapshot: HistoryState = {
      nodes: JSON.parse(JSON.stringify(get().nodes)),
      edges: JSON.parse(JSON.stringify(get().edges)),
    };

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      history: {
        past: newPast,
        future: [currentSnapshot, ...future],
      },
    });

    get().saveGraph();
  },

  redo: () => {
    const { past, future } = get().history;
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    const currentSnapshot: HistoryState = {
      nodes: JSON.parse(JSON.stringify(get().nodes)),
      edges: JSON.parse(JSON.stringify(get().edges)),
    };

    set({
      nodes: next.nodes,
      edges: next.edges,
      history: {
        past: [...past, currentSnapshot],
        future: newFuture,
      },
    });

    get().saveGraph();
  },

  fetchLinkedTasks: async (canvasId: string) => {
    try {
      const response = await fetch(`/api/canvas/${canvasId}/tasks`);
      const json: ApiResponse<{ items: { id: string; canvasNodeId?: string | null }[] }> =
        await response.json();

      if (response.ok && json.success && json.data?.items) {
        const linkMap: Record<string, string> = {};
        for (const item of json.data.items) {
          if (item.canvasNodeId) {
            linkMap[item.canvasNodeId] = item.id;
          }
        }
        set({ linkedTasks: linkMap });
      }
    } catch (err) {
      console.warn('Failed to fetch canvas linked tasks:', err);
    }
  },

  openNodeToTaskModal: (nodeId: string) => {
    set({
      isNodeToTaskModalOpen: true,
      convertingNodeId: nodeId,
      error: null,
    });
  },

  closeNodeToTaskModal: () => {
    set({
      isNodeToTaskModalOpen: false,
      convertingNodeId: null,
      isConvertingNodeToTask: false,
    });
  },

  convertNodeToTask: async (canvasId: string, nodeId: string, payload) => {
    set({ isConvertingNodeToTask: true, error: null });
    try {
      const response = await fetch(`/api/canvas/${canvasId}/nodes/${nodeId}/to-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });

      const json: ApiResponse<import('@/types/task').Task> = await response.json();

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Failed to convert node to task');
      }

      const createdTask = json.data;

      // Update linked tasks mapping
      set((state) => ({
        linkedTasks: {
          ...state.linkedTasks,
          [nodeId]: createdTask.id,
        },
        isNodeToTaskModalOpen: false,
        convertingNodeId: null,
        isConvertingNodeToTask: false,
      }));

      return createdTask;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error converting node to task';
      set({ error: msg, isConvertingNodeToTask: false });
      return null;
    }
  },

  setVariableSidebarOpen: (isOpen) => set({ isVariableSidebarOpen: isOpen }),
  setBranchModalOpen: (isOpen) => set({ isBranchModalOpen: isOpen }),
  clearError: () => set({ error: null }),
}));

