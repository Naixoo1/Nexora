import { create } from 'zustand';
import { useCanvasStore } from './useCanvasStore';
import { useTaskStore } from './useTaskStore';
import type {
  AcademicTutorMode,
  ChatMessage,
  ChatSession,
  ChatSessionWithMessages,
  TaskContextSnapshot,
  TaskSubtaskSnapshot,
  CanvasContextSnapshot,
  CanvasNodeSnapshot,
  CanvasEdgeSnapshot,
  ChatSourceCitation,
  ChatAttachment,
  ChatAttachmentMeta,
  ChatRole,
} from '@/types/chat';
import type { ApiResponse, CanvasNodeType, NodeValidationStatus } from '@/types/canvas';
import type { TaskStatus } from '@/types/task';

export interface ChatStoreState {
  // Drawer UI
  isDrawerOpen: boolean;

  // Active Context & Multimodal Attachments
  activeTutorMode: AcademicTutorMode;
  taskContext?: TaskContextSnapshot;
  canvasContext?: CanvasContextSnapshot;
  customInstructions?: string;
  attachments: ChatAttachment[];

  // Session & Message State
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  streamingMessage: string | null;
  isSending: boolean;
  isLoadingHistory: boolean;
  error: string | null;

  // Actions - Drawer Controls
  openDrawer: (options?: {
    taskContext?: TaskContextSnapshot;
    canvasContext?: CanvasContextSnapshot;
    initialPrompt?: string;
    tutorMode?: AcademicTutorMode;
  }) => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  // Actions - Context Controls
  setTutorMode: (mode: AcademicTutorMode) => void;
  setTaskContext: (context?: TaskContextSnapshot) => void;
  setCanvasContext: (context?: CanvasContextSnapshot) => void;
  setCustomInstructions: (instructions?: string) => void;
  clearContext: () => void;

  // Actions - Attachments
  addAttachment: (attachment: ChatAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;

  // Actions - Chat API Integration
  fetchSessions: (
    taskIdOrOptions?: { taskId?: string; canvasId?: string } | string,
    canvasId?: string
  ) => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  createSession: (title?: string, taskId?: string, canvasId?: string) => Promise<ChatSession | null>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  sendMessage: (content?: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

/**
 * Extracts citation tags like [[node:id:Label]] or [[task:id:Label]] from message text
 */
export function extractCitations(text: string): ChatSourceCitation[] {
  const citations: ChatSourceCitation[] = [];
  const regex = /\[\[(node|task|formula):([^:|\]]+)(?:[:|]([^\]]+))?\]\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [, type, refId, label] = match;
    const sourceType = type === 'node' ? 'canvas_node' : type === 'task' ? 'task' : 'formula';
    citations.push({
      id: `cite-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sourceType,
      referenceId: refId.trim(),
      label: (label && label.trim()) || (sourceType === 'canvas_node' ? `Node: ${refId.trim()}` : `Task: ${refId.trim()}`),
    });
  }

  return citations;
}

/**
 * Parses ```nexora-node { ... } ``` JSON blocks from AI messages and appends them
 * directly to the active STEM canvas.
 */
export function parseAndApplyNexoraNodes(text: string) {
  const regex = /```nexora-node\s*([\s\S]*?)\s*```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const parsed = JSON.parse(jsonStr);

      const rawType = (parsed.type || parsed.nodeType || 'reasoning_step').toLowerCase();
      const nodeType =
        rawType === 'derivation' || rawType === 'step' || rawType === 'reasoning_step'
          ? ('reasoning_step' as const)
          : rawType === 'formula' || rawType === 'formula_block'
          ? ('formula_block' as const)
          : rawType === 'theorem' || rawType === 'theorem_proof'
          ? ('theorem_proof' as const)
          : rawType === 'what_if' || rawType === 'what_if_branch'
          ? ('what_if_branch' as const)
          : rawType === 'problem_root' || rawType === 'root'
          ? ('problem_root' as const)
          : ('reasoning_step' as const);

      const title = parsed.title || 'Derived Step';
      const latexFormula = parsed.latexFormula || parsed.latex || '';
      const content = parsed.content || parsed.description || '';
      const validationStatus = parsed.validationStatus || parsed.status || 'valid';

      const canvasStore = useCanvasStore.getState();

      if (canvasStore.canvasId) {
        // Prevent duplicate addition of exact same node in session
        const isDuplicate = canvasStore.nodes.some(
          (n: { data: { title: string; latexFormula?: string } }) =>
            n.data.title === title && n.data.latexFormula === latexFormula
        );

        if (!isDuplicate) {
          const currentNodesCount = canvasStore.nodes.length;
          const position = {
            x: 250 + (currentNodesCount % 3) * 280,
            y: 160 + Math.floor(currentNodesCount / 3) * 220,
          };

          canvasStore.addNode(nodeType, position, {
            title,
            latexFormula,
            content,
            validationStatus,
          });
        }
      }
    } catch (err) {
      console.warn('[Chat Store]: Could not parse nexora-node payload:', err);
    }
  }
}

/**
 * Automatically serializes the live STEM canvas and task state into rich snapshots
 */
export function buildLiveContextPayload(): {
  liveCanvasContext?: CanvasContextSnapshot;
  liveTaskContext?: TaskContextSnapshot;
} {
  let liveCanvasContext: CanvasContextSnapshot | undefined = undefined;
  let liveTaskContext: TaskContextSnapshot | undefined = undefined;

  try {
    const canvasStore = useCanvasStore.getState();

    if (canvasStore && canvasStore.canvasId) {
      // Build map of child -> parent IDs from edges
      const parentMap = new Map<string, string[]>();
      canvasStore.edges.forEach((edge) => {
        if (!parentMap.has(edge.target)) {
          parentMap.set(edge.target, []);
        }
        parentMap.get(edge.target)!.push(edge.source);
      });

      const nodes: CanvasNodeSnapshot[] = canvasStore.nodes.map((node) => ({
        id: node.id,
        title: node.data.title || 'Untitled Node',
        content: node.data.content || '',
        latexFormula: node.data.latexFormula || '',
        nodeType: node.data.nodeType || (node.type as CanvasNodeType) || 'reasoning_step',
        validationStatus: node.data.validationStatus || 'valid',
        parentIds: parentMap.get(node.id) || [],
        isRoot: node.type === 'problem_root' || (parentMap.get(node.id) || []).length === 0,
        isSelected: node.id === canvasStore.selectedNodeId,
      }));

      const edges: CanvasEdgeSnapshot[] = canvasStore.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: typeof edge.label === 'string' ? edge.label : (edge.data?.label as string) || 'implication',
        edgeType: (edge.data?.edgeType as string) || 'implication',
      }));

      const selectedNode = canvasStore.nodes.find((n) => n.id === canvasStore.selectedNodeId);

      liveCanvasContext = {
        canvasId: canvasStore.canvasId,
        canvasTitle: canvasStore.title || 'STEM Logic Canvas',
        category: canvasStore.category || 'STEM',
        targetGoal: canvasStore.description || '',
        description: canvasStore.description || '',
        selectedNodeId: canvasStore.selectedNodeId || undefined,
        selectedNodeType:
          selectedNode?.data.nodeType || (selectedNode?.type as CanvasNodeType) || undefined,
        selectedNodeTitle: selectedNode?.data.title || undefined,
        selectedNodeFormula: selectedNode?.data.latexFormula || undefined,
        selectedNodeValidation: selectedNode?.data.validationStatus || undefined,
        derivationPath: [],
        activeVariables: canvasStore.globalVariables || [],
        nodes,
        edges,
      };
    }
  } catch (err) {
    console.warn('[Chat Store]: Could not extract live canvas state:', err);
  }

  try {
    const taskStore = useTaskStore.getState();

    if (taskStore && taskStore.tasks && taskStore.tasks.length > 0) {
      const activeTask = taskStore.editingTask || taskStore.tasks[0];
      if (activeTask) {
        const subtasks: TaskSubtaskSnapshot[] = taskStore.tasks
          .filter((t) => t.parentId === activeTask.id)
          .map((sub) => ({
            id: sub.id,
            title: sub.title,
            status: sub.status,
            completed: sub.status === 'completed',
          }));

        const completedCount = subtasks.filter((s) => s.completed).length;

        liveTaskContext = {
          taskId: activeTask.id,
          title: activeTask.title,
          description: activeTask.description,
          status: activeTask.status,
          priority: activeTask.priority,
          category: activeTask.category,
          dueDate: activeTask.dueDate ? new Date(activeTask.dueDate).toISOString() : null,
          isOverdue: activeTask.dueDate ? new Date(activeTask.dueDate) < new Date() : false,
          subtasks,
          subtaskCount: subtasks.length,
          completedSubtaskCount: completedCount,
          milestoneProgressPct:
            subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0,
        };
      }
    }
  } catch (err) {
    console.warn('[Chat Store]: Could not extract live task state:', err);
  }

  return { liveCanvasContext, liveTaskContext };
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  isDrawerOpen: false,

  activeTutorMode: 'socratic',
  taskContext: undefined,
  canvasContext: undefined,
  customInstructions: undefined,
  attachments: [],

  sessions: [],
  currentSession: null,
  messages: [],
  streamingMessage: null,
  isSending: false,
  isLoadingHistory: false,
  error: null,

  openDrawer: (options) => {
    set((state) => ({
      isDrawerOpen: true,
      taskContext: options?.taskContext ?? state.taskContext,
      canvasContext: options?.canvasContext ?? state.canvasContext,
      activeTutorMode: options?.tutorMode ?? state.activeTutorMode,
      error: null,
    }));

    // If initial prompt provided, send it automatically
    if (options?.initialPrompt && options.initialPrompt.trim()) {
      get().sendMessage(options.initialPrompt.trim());
    }
  },

  closeDrawer: () => {
    set({ isDrawerOpen: false });
  },

  toggleDrawer: () => {
    set((state) => ({ isDrawerOpen: !state.isDrawerOpen }));
  },

  setTutorMode: (mode) => {
    set({ activeTutorMode: mode });
  },

  setTaskContext: (context) => {
    set({ taskContext: context });
  },

  setCanvasContext: (context) => {
    set({ canvasContext: context });
  },

  setCustomInstructions: (instructions) => {
    set({ customInstructions: instructions });
  },

  clearContext: () => {
    set({ taskContext: undefined, canvasContext: undefined, customInstructions: undefined });
  },

  addAttachment: (attachment) => {
    set((state) => {
      // Max 5 attachments allowed
      if (state.attachments.length >= 5) {
        return { error: 'Maximum 5 attachments allowed per message.' };
      }
      return {
        attachments: [...state.attachments, attachment],
        error: null,
      };
    });
  },

  removeAttachment: (id) => {
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== id),
    }));
  },

  clearAttachments: () => {
    set({ attachments: [] });
  },

  fetchSessions: async (taskIdOrOptions?: { taskId?: string; canvasId?: string } | string, canvasIdArg?: string) => {
    set({ isLoadingHistory: true, error: null });
    try {
      const params = new URLSearchParams();
      let tId: string | undefined;
      let cId: string | undefined;

      if (typeof taskIdOrOptions === 'object' && taskIdOrOptions !== null) {
        tId = taskIdOrOptions.taskId;
        cId = taskIdOrOptions.canvasId;
      } else if (typeof taskIdOrOptions === 'string') {
        tId = taskIdOrOptions;
        cId = canvasIdArg;
      }

      if (tId) params.set('taskId', tId);
      if (cId) params.set('canvasId', cId);

      const res = await fetch(`/api/chat/sessions?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || 'Failed to load chat history');
      }

      const data = await res.json();
      const sessionsList =
        data.data?.items ||
        data.data?.sessions ||
        (Array.isArray(data.data) ? data.data : []);

      set({ sessions: sessionsList, isLoadingHistory: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error fetching sessions',
        isLoadingHistory: false,
      });
    }
  },

  selectSession: async (sessionId: string) => {
    set({ isLoadingHistory: true, error: null });
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || 'Failed to load session messages');
      }

      const data: ApiResponse<ChatSessionWithMessages> = await res.json();
      if (data.data) {
        set({
          currentSession: data.data,
          messages: data.data.messages || [],
          isLoadingHistory: false,
          activeTutorMode: data.data.tutorMode || 'socratic',
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error loading session',
        isLoadingHistory: false,
      });
    }
  },

  createSession: async (title = 'New Brainstorming Session', taskId, canvasId) => {
    set({ error: null });
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          taskId,
          canvasId,
          tutorMode: get().activeTutorMode,
        }),
      });

      if (!res.ok) throw new Error('Failed to create chat session');
      const data: ApiResponse<ChatSession> = await res.json();
      if (data.data) {
        set((state) => ({
          sessions: [data.data!, ...state.sessions],
          currentSession: data.data,
          messages: [],
        }));
        return data.data;
      }
      return null;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error creating session' });
      return null;
    }
  },

  deleteSession: async (sessionId: string) => {
    set({ error: null });
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete session');

      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        messages: state.currentSession?.id === sessionId ? [] : state.messages,
      }));
      return true;
    } catch (err) {
      console.error('Failed to delete chat session:', err);
      return false;
    }
  },

  sendMessage: async (content?: string) => {
    const rawContent = (content !== undefined ? content : '').trim();
    const currentAttachments = [...get().attachments];

    // Check if there is text or at least one attachment
    if ((!rawContent && currentAttachments.length === 0) || get().isSending) return;

    const userMessageContent = rawContent || 'Analyze the attached image/document.';

    // Extract live context from active canvas & task stores if available
    const { liveCanvasContext, liveTaskContext } = buildLiveContextPayload();
    const activeMode = get().activeTutorMode;
    const taskCtx = liveTaskContext || get().taskContext;
    const canvasCtx = liveCanvasContext || get().canvasContext;
    const customInst = get().customInstructions;

    // Convert to lightweight metadata for storage
    const attachmentMetas: ChatAttachmentMeta[] = currentAttachments.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      mimeType: a.mimeType,
      size: a.size,
    }));

    // Temporary User Message
    const tempUserMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      sessionId: get().currentSession?.id || '',
      userId: 'current-user',
      role: 'user' as ChatRole,
      content: userMessageContent,
      attachments: attachmentMetas.length > 0 ? attachmentMetas : undefined,
      contextSnapshot: {
        tutorMode: activeMode,
        taskContext: taskCtx,
        canvasContext: canvasCtx,
        customInstructions: customInst,
      },
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, tempUserMessage],
      attachments: [], // Clear attachments buffer upon sending
      isSending: true,
      streamingMessage: '',
      error: null,
    }));

    try {
      const payload = {
        sessionId: get().currentSession?.id,
        taskId: taskCtx?.taskId,
        canvasId: canvasCtx?.canvasId,
        message: userMessageContent,
        attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
        context: {
          tutorMode: activeMode,
          taskContext: taskCtx,
          canvasContext: canvasCtx,
          customInstructions: customInst,
        },
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorText = `Server responded with HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          errorText = errorJson.error || errorJson.message || errorText;
        } catch {
          const raw = await response.text().catch(() => '');
          if (raw) errorText = raw;
        }
        throw new Error(errorText);
      }

      // Check session ID header
      const returnedSessionId = response.headers.get('X-Chat-Session-Id');
      if (returnedSessionId && (!get().currentSession || get().currentSession?.id !== returnedSessionId)) {
        set({
          currentSession: {
            id: returnedSessionId,
            userId: 'current-user',
            taskId: taskCtx?.taskId,
            canvasId: canvasCtx?.canvasId,
            title: userMessageContent.slice(0, 40) || 'Brainstorming Session',
            tutorMode: activeMode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }

      // Stream handling
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAssistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            fullAssistantText += chunk;
            set({ streamingMessage: fullAssistantText });
          }
        }
      } else {
        fullAssistantText = await response.text();
      }

      if (!fullAssistantText.trim()) {
        throw new Error('AI returned an empty response. Please check your Gemini API key or try again.');
      }

      // Extract citations and auto-sync canvas nodes
      const citations = extractCitations(fullAssistantText);
      parseAndApplyNexoraNodes(fullAssistantText);

      // Final Assistant Message
      const finalAssistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sessionId: returnedSessionId || get().currentSession?.id || '',
        userId: 'assistant',
        role: 'assistant' as ChatRole,
        content: fullAssistantText,
        citations,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, finalAssistantMessage],
        streamingMessage: null,
        isSending: false,
        error: null,
      }));
    } catch (err) {
      console.error('[Chat Store Error]:', err);
      const errorMessageText = err instanceof Error ? err.message : 'AI failed to respond.';

      const errorAssistantMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sessionId: get().currentSession?.id || '',
        userId: 'assistant',
        role: 'assistant' as ChatRole,
        content: `⚠️ **AI failed to respond.**\n\n*Error: ${errorMessageText}*\n\nPlease check your \`GEMINI_API_KEY\` configuration in \`.env.local\` or your network connection and try again.`,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorAssistantMessage],
        error: errorMessageText,
        streamingMessage: null,
        isSending: false,
      }));
    }
  },

  clearMessages: () => set({ messages: [], streamingMessage: null }),
  clearError: () => set({ error: null }),
}));
