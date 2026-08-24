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
import type { GradeLevel } from '@/types/planner';

export interface ChatStoreState {
  // Drawer UI & View Layout
  isDrawerOpen: boolean;
  isExpanded: boolean;
  isHistoryOpen: boolean;
  isSettingsOpen: boolean;
  customApiKey: string | null;
  useWebLLM: boolean;
  webLLMProgress: number;
  webLLMStatusText: string;

  // Active Context & Multimodal Attachments
  activeTutorMode: AcademicTutorMode;
  gradeLevel: GradeLevel;
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

  // Actions - Drawer & View Controls
  openDrawer: (options?: {
    taskContext?: TaskContextSnapshot;
    canvasContext?: CanvasContextSnapshot;
    initialPrompt?: string;
    tutorMode?: AcademicTutorMode;
    gradeLevel?: GradeLevel;
  }) => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  toggleHistory: () => void;
  setHistoryOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  setCustomApiKey: (key: string | null) => void;
  setUseWebLLM: (enabled: boolean) => void;
  setWebLLMProgress: (progress: number, text: string) => void;

  // Actions - Context Controls
  setTutorMode: (mode: AcademicTutorMode) => void;
  setGradeLevel: (grade: GradeLevel) => void;
  setTaskContext: (context?: TaskContextSnapshot) => void;
  setCanvasContext: (context?: CanvasContextSnapshot) => void;
  setCustomInstructions: (instructions?: string) => void;
  clearContext: () => void;

  // Actions - Attachments
  addAttachment: (attachment: ChatAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;

  // Actions - Multi-Session History & Memory
  fetchSessions: (
    taskIdOrOptions?: { taskId?: string; canvasId?: string } | string,
    canvasId?: string
  ) => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  createSession: (title?: string, taskId?: string, canvasId?: string) => Promise<ChatSession | null>;
  startNewChat: (title?: string) => void;
  renameSession: (sessionId: string, newTitle: string) => Promise<boolean>;
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
 * Helper to get cached messages from localStorage
 */
function getCachedMessages(sessionId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw =
      localStorage.getItem(`nexora_messages_${sessionId}`) ||
      localStorage.getItem(`nexora_guest_messages_${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Helper to cache messages into localStorage
 */
function setCachedMessages(sessionId: string, messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const str = JSON.stringify(messages);
    localStorage.setItem(`nexora_messages_${sessionId}`, str);
    if (sessionId.startsWith('guest-')) {
      localStorage.setItem(`nexora_guest_messages_${sessionId}`, str);
    }
  } catch {
    // ignore
  }
}

/**
 * Automatically parses generated node action blocks from LLM responses and applies them
 * directly to the active STEM canvas.
 */
export function parseAndApplyNexoraNodes(text: string) {
  if (!text || typeof text !== 'string') return;

  const patterns = [
    // 1. Fenced ```nexora-node ... ``` or ```node ... ```
    /```(?:nexora-node|node)\s*([\s\S]*?)\s*```/gi,
    // 2. Unbackticked raw `nexora-node { ... }`
    /(?:^|\n)\s*nexora-node\s*(\{[\s\S]*?\})/gi,
    // 3. Fenced ```json { ... } ``` containing node actions or titles
    /```json\s*(\{[\s\S]*?"(?:title|action|type|latexFormula)"[\s\S]*?\})\s*```/gi,
    // 4. Raw JSON create_node action objects
    /(?:^|\n)\s*(\{\s*"action"\s*:\s*"create_node"[\s\S]*?\})/gi,
  ];

  const candidateJsons: string[] = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const extracted = match[1]?.trim();
      if (extracted && !candidateJsons.includes(extracted)) {
        candidateJsons.push(extracted);
      }
    }
  }

  for (const jsonStr of candidateJsons) {
    try {
      let parsed = JSON.parse(jsonStr);

      // Support wrapping {"action": "create_node", "node": {...}}
      if (parsed.action === 'create_node' && parsed.node) {
        parsed = parsed.node;
      }

      if (
        !parsed.title &&
        !parsed.latexFormula &&
        !parsed.latex &&
        !parsed.question &&
        !parsed.eventTitle &&
        !parsed.characterRole &&
        !parsed.dialogueLine
      ) {
        continue;
      }

      const rawType = (parsed.type || parsed.nodeType || 'reasoning_step').toLowerCase();
      const nodeType: CanvasNodeType =
        rawType === 'flashcard' ||
        rawType === 'recall' ||
        rawType === 'active_recall' ||
        rawType === 'active_recall_flashcard'
          ? 'active_recall_flashcard'
          : rawType === 'timeline' ||
            rawType === 'timeline_event' ||
            rawType === 'event' ||
            rawType === 'milestone'
          ? 'timeline_event'
          : rawType === 'comparison' ||
            rawType === 'compare' ||
            rawType === 'concept_comparison'
          ? 'concept_comparison'
          : rawType === 'dialogue' ||
            rawType === 'rehearsal' ||
            rawType === 'dialogue_rehearsal' ||
            rawType === 'roleplay'
          ? 'dialogue_rehearsal'
          : rawType === 'derivation' ||
            rawType === 'step' ||
            rawType === 'reasoning_step'
          ? 'reasoning_step'
          : rawType === 'formula' || rawType === 'formula_block'
          ? 'formula_block'
          : rawType === 'theorem' || rawType === 'theorem_proof'
          ? 'theorem_proof'
          : rawType === 'what_if' || rawType === 'what_if_branch'
          ? 'what_if_branch'
          : rawType === 'problem_root' || rawType === 'root'
          ? 'problem_root'
          : 'reasoning_step';

      const title =
        parsed.title ||
        parsed.eventTitle ||
        parsed.question ||
        parsed.characterRole ||
        'Derived Step';
      const latexFormula = parsed.latexFormula || parsed.latex || '';
      const content =
        parsed.content ||
        parsed.description ||
        parsed.answer ||
        parsed.causeOrSignificance ||
        '';
      const validationStatus = parsed.validationStatus || parsed.status || 'valid';

      // Build structured customData for multidisciplinary nodes
      let customData: Record<string, unknown> = parsed.customData || {};
      if (nodeType === 'active_recall_flashcard') {
        customData = {
          type: 'active_recall_flashcard',
          payload: {
            question: parsed.question || title,
            answer: parsed.answer || content,
            topicTag: parsed.topicTag,
            confidenceScore: parsed.confidenceScore ?? 0,
          },
        };
      } else if (nodeType === 'timeline_event') {
        customData = {
          type: 'timeline_event',
          payload: {
            dateOrPeriod: parsed.dateOrPeriod || parsed.date || parsed.period || 'Historical Date',
            eventTitle: parsed.eventTitle || title,
            causeOrSignificance: parsed.causeOrSignificance || content,
            keyFigures: parsed.keyFigures || [],
            eraTag: parsed.eraTag,
          },
        };
      } else if (nodeType === 'concept_comparison') {
        customData = {
          type: 'concept_comparison',
          payload: {
            entityA: parsed.entityA || { name: 'Entity A', traits: [] },
            entityB: parsed.entityB || { name: 'Entity B', traits: [] },
            criteriaMatrix: parsed.criteriaMatrix || [],
            keyTakeaway: parsed.keyTakeaway || content,
          },
        };
      } else if (nodeType === 'dialogue_rehearsal') {
        customData = {
          type: 'dialogue_rehearsal',
          payload: {
            characterRole: parsed.characterRole || parsed.role || title,
            dialogueLine: parsed.dialogueLine || parsed.dialogue || title,
            phoneticOrPronunciationCue: parsed.phoneticOrPronunciationCue || parsed.pronunciation,
            toneOrContextCue: parsed.toneOrContextCue || parsed.tone,
            translationOrMeaning: parsed.translationOrMeaning || parsed.meaning || content,
          },
        };
      }

      const canvasStore = useCanvasStore.getState();

      if (canvasStore && canvasStore.canvasId) {
        // Prevent duplicate addition of exact same node in session
        const isDuplicate = canvasStore.nodes.some(
          (n: { data: { title: string; latexFormula?: string } }) =>
            n.data.title === title && (n.data.latexFormula || '') === latexFormula
        );

        if (!isDuplicate) {
          // Identify parent node: selectedNodeId -> problem_root -> latest node
          const selectedParent = canvasStore.selectedNodeId
            ? canvasStore.nodes.find((n) => n.id === canvasStore.selectedNodeId)
            : canvasStore.nodes.find((n) => n.type === 'problem_root') ||
              canvasStore.nodes[canvasStore.nodes.length - 1];

          const currentNodesCount = canvasStore.nodes.length;
          let position = {
            x: 250 + (currentNodesCount % 3) * 280,
            y: 160 + Math.floor(currentNodesCount / 3) * 220,
          };

          if (selectedParent) {
            const existingChildren = canvasStore.edges.filter(
              (e) => e.source === selectedParent.id
            ).length;
            const horizontalOffset = existingChildren > 0 ? (existingChildren * 220) - 80 : 0;

            position = {
              x: selectedParent.position.x + horizontalOffset,
              y: selectedParent.position.y + 220,
            };
          }

          const newNode = canvasStore.addNode(nodeType, position, {
            title,
            latexFormula,
            content,
            validationStatus,
            customData,
          });

          // Auto-connect from parent node
          if (selectedParent && newNode) {
            canvasStore.onConnect({
              source: selectedParent.id,
              target: newNode.id,
              sourceHandle: null,
              targetHandle: null,
            });
            // Update selection to newly generated node for continuous derivations
            canvasStore.selectNode(newNode.id);
          }
        }
      }
    } catch (err) {
      console.warn('[Chat Store]: Could not parse canvas node payload:', err);
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
  isExpanded: false,
  isHistoryOpen: false,
  isSettingsOpen: false,
  customApiKey:
    typeof window !== 'undefined' ? localStorage.getItem('nexora_custom_gemini_key') : null,
  useWebLLM:
    typeof window !== 'undefined' ? localStorage.getItem('nexora_use_web_llm') === 'true' : false,
  webLLMProgress: 0,
  webLLMStatusText: '',

  activeTutorMode: 'socratic',
  gradeLevel: 'SENIOR_HIGH',
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
      gradeLevel: options?.gradeLevel ?? state.gradeLevel,
      error: null,
    }));

    // If initial prompt provided, send it automatically
    if (options?.initialPrompt && options.initialPrompt.trim()) {
      get().sendMessage(options.initialPrompt.trim());
    }
  },

  closeDrawer: () => {
    set({ isDrawerOpen: false, isExpanded: false, isHistoryOpen: false, isSettingsOpen: false });
  },

  toggleDrawer: () => {
    set((state) => ({ isDrawerOpen: !state.isDrawerOpen }));
  },

  toggleExpanded: () => {
    set((state) => ({ isExpanded: !state.isExpanded }));
  },

  setExpanded: (expanded) => {
    set({ isExpanded: expanded });
  },

  toggleHistory: () => {
    set((state) => ({ isHistoryOpen: !state.isHistoryOpen }));
  },

  setHistoryOpen: (open) => {
    set({ isHistoryOpen: open });
  },

  toggleSettings: () => {
    set((state) => ({ isSettingsOpen: !state.isSettingsOpen }));
  },

  setSettingsOpen: (open) => {
    set({ isSettingsOpen: open });
  },

  setCustomApiKey: (key: string | null) => {
    const trimmed = key && key.trim() ? key.trim() : null;
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('nexora_custom_gemini_key', trimmed);
      } else {
        localStorage.removeItem('nexora_custom_gemini_key');
      }
    }
    set({ customApiKey: trimmed });
  },

  setUseWebLLM: (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexora_use_web_llm', enabled ? 'true' : 'false');
    }
    set({ useWebLLM: enabled });
  },

  setWebLLMProgress: (progress: number, text: string) => {
    set({ webLLMProgress: progress, webLLMStatusText: text });
  },

  setTutorMode: (mode) => {
    set({ activeTutorMode: mode });
  },

  setGradeLevel: (grade) => {
    set({ gradeLevel: grade });
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
        // Fallback for guest mode localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('nexora_guest_chat_sessions');
          if (stored) {
            try {
              const guestSessions: ChatSession[] = JSON.parse(stored);
              set({ sessions: guestSessions, isLoadingHistory: false });
              return;
            } catch {
              // ignore
            }
          }
        }
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
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nexora_guest_chat_sessions');
        if (stored) {
          try {
            const guestSessions: ChatSession[] = JSON.parse(stored);
            set({ sessions: guestSessions, isLoadingHistory: false });
            return;
          } catch {
            // ignore
          }
        }
      }

      set({
        error: err instanceof Error ? err.message : 'Error fetching sessions',
        isLoadingHistory: false,
      });
    }
  },

  selectSession: async (sessionId: string) => {
    // 1. Flush previous active session messages into local cache before switching
    const prevSession = get().currentSession;
    if (prevSession && get().messages.length > 0) {
      setCachedMessages(prevSession.id, get().messages);
    }

    // 2. Instant-paint from local cache if available for target sessionId
    const cached = getCachedMessages(sessionId);
    const existingSession = get().sessions.find((s) => s.id === sessionId) || null;

    set({
      currentSession: existingSession || prevSession,
      messages: cached.length > 0 ? cached : [],
      streamingMessage: null,
      isSending: false,
      isLoadingHistory: true,
      error: null,
    });

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (!res.ok) {
        // Fallback for guest mode or offline
        if (cached.length > 0) {
          set({ isLoadingHistory: false });
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || 'Failed to load session messages');
      }

      const data: ApiResponse<ChatSessionWithMessages> = await res.json();
      if (data.data) {
        const fetchedMessages = data.data.messages || [];
        setCachedMessages(sessionId, fetchedMessages);

        set({
          currentSession: data.data,
          messages: fetchedMessages,
          isLoadingHistory: false,
          activeTutorMode: data.data.tutorMode || 'socratic',
        });
      }
    } catch (err) {
      // Keep cached messages if available
      if (cached.length > 0) {
        set({ isLoadingHistory: false });
        return;
      }
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

      if (!res.ok) {
        // Guest mode fallback
        const guestSession: ChatSession = {
          id: `guest-${Date.now()}`,
          userId: 'guest',
          taskId,
          canvasId,
          title,
          tutorMode: get().activeTutorMode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('nexora_guest_chat_sessions');
          const list: ChatSession[] = stored ? JSON.parse(stored) : [];
          localStorage.setItem('nexora_guest_chat_sessions', JSON.stringify([guestSession, ...list]));
        }

        set((state) => ({
          sessions: [guestSession, ...state.sessions],
          currentSession: guestSession,
          messages: [],
        }));
        return guestSession;
      }

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
      // Local fallback for guest
      const guestSession: ChatSession = {
        id: `guest-${Date.now()}`,
        userId: 'guest',
        taskId,
        canvasId,
        title,
        tutorMode: get().activeTutorMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nexora_guest_chat_sessions');
        const list: ChatSession[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem('nexora_guest_chat_sessions', JSON.stringify([guestSession, ...list]));
      }

      set((state) => ({
        sessions: [guestSession, ...state.sessions],
        currentSession: guestSession,
        messages: [],
      }));
      return guestSession;
    }
  },

  startNewChat: (title = 'New Brainstorming Session') => {
    // Flush current messages to cache if needed
    const cur = get().currentSession;
    if (cur && get().messages.length > 0) {
      setCachedMessages(cur.id, get().messages);
    }

    set({
      currentSession: null,
      messages: [],
      streamingMessage: null,
      error: null,
      isSending: false,
    });
  },

  renameSession: async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return false;
    const trimmed = newTitle.trim().slice(0, 100);

    // Optimistically update client state
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, title: trimmed } : s)),
      currentSession:
        state.currentSession?.id === sessionId ? { ...state.currentSession, title: trimmed } : state.currentSession,
    }));

    // Update guest localStorage cache if present
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexora_guest_chat_sessions');
      if (stored) {
        try {
          const list: ChatSession[] = JSON.parse(stored);
          const updatedList = list.map((s) => (s.id === sessionId ? { ...s, title: trimmed } : s));
          localStorage.setItem('nexora_guest_chat_sessions', JSON.stringify(updatedList));
        } catch {
          // ignore
        }
      }
    }

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });

      return res.ok;
    } catch (err) {
      console.warn('[Chat Store]: Rename remote failed, state updated locally:', err);
      return true;
    }
  },

  deleteSession: async (sessionId: string) => {
    set({ error: null });

    // Optimistically delete from state
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
      messages: state.currentSession?.id === sessionId ? [] : state.messages,
    }));

    // Delete from localStorage cache
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`nexora_messages_${sessionId}`);
      localStorage.removeItem(`nexora_guest_messages_${sessionId}`);

      const stored = localStorage.getItem('nexora_guest_chat_sessions');
      if (stored) {
        try {
          const list: ChatSession[] = JSON.parse(stored);
          const filtered = list.filter((s) => s.id !== sessionId);
          localStorage.setItem('nexora_guest_chat_sessions', JSON.stringify(filtered));
        } catch {
          // ignore
        }
      }
    }

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      return res.ok;
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

    const activeSessionId = get().currentSession?.id || `guest-${Date.now()}`;

    // Temporary User Message
    const tempUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sessionId: activeSessionId,
      userId: 'current-user',
      role: 'user' as ChatRole,
      content: userMessageContent,
      attachments: attachmentMetas.length > 0 ? attachmentMetas : undefined,
      contextSnapshot: {
        tutorMode: activeMode,
        gradeLevel: get().gradeLevel,
        taskContext: taskCtx,
        canvasContext: canvasCtx,
        customInstructions: customInst,
      },
      createdAt: new Date().toISOString(),
    };

    const initialMessages = [...get().messages, tempUserMessage];
    set({
      messages: initialMessages,
      attachments: [], // Clear attachments buffer upon sending
      isSending: true,
      streamingMessage: '',
      error: null,
    });

    // Cache updated user message locally
    setCachedMessages(activeSessionId, initialMessages);

    // If On-Device AI (WebGPU) is active and query has no attachments, attempt local execution
    if (typeof window !== 'undefined' && get().useWebLLM && currentAttachments.length === 0) {
      try {
        const { checkWebGPUSupport, streamLocalCompletion } = await import(
          '@/services/web-llm-service'
        );
        const isSupported = await checkWebGPUSupport();

        if (isSupported) {
          set({
            streamingMessage: '',
            webLLMStatusText: 'Generating on local device GPU...',
          });

          const messagesPayload = [
            {
              role: 'system' as const,
              content: `You are Nexora AI, a world-class STEM tutor in ${activeMode} mode. Break down problems step-by-step with clear explanations and LaTeX notation.`,
            },
            ...get().messages.map((m) => ({
              role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
              content: m.content,
            })),
            { role: 'user' as const, content: userMessageContent },
          ];

          let localAccumulated = '';
          await streamLocalCompletion(
            messagesPayload,
            (chunk) => {
              localAccumulated += chunk;
              set({ streamingMessage: localAccumulated });
            },
            {
              onProgress: (report) => {
                set({
                  webLLMProgress: report.progress,
                  webLLMStatusText: report.text,
                });
              },
            }
          );

          const sessionTitle = userMessageContent.slice(0, 45) || 'Brainstorming Session';

          if (!get().currentSession) {
            const newSessionObj: ChatSession = {
              id: activeSessionId,
              userId: 'current-user',
              taskId: taskCtx?.taskId,
              canvasId: canvasCtx?.canvasId,
              title: sessionTitle,
              tutorMode: activeMode,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            set((state) => ({
              currentSession: newSessionObj,
              sessions: state.sessions.some((s) => s.id === activeSessionId)
                ? state.sessions
                : [newSessionObj, ...state.sessions],
            }));
          }

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            sessionId: activeSessionId,
            userId: 'nexora-webllm-local',
            role: 'assistant',
            content: localAccumulated,
            citations: extractCitations(localAccumulated),
            createdAt: new Date().toISOString(),
          };

          const finalMessages = [...get().messages, assistantMessage];
          set({
            messages: finalMessages,
            streamingMessage: null,
            isSending: false,
            webLLMStatusText: '',
          });

          setCachedMessages(activeSessionId, finalMessages);
          return;
        }
      } catch (webllmErr) {
        console.warn(
          '[WebLLM Client Fallback] Local WebGPU execution failed, falling back to /api/chat cascade:',
          webllmErr
        );
      }
    }

    try {
      const payload = {
        sessionId: get().currentSession?.id,
        taskId: taskCtx?.taskId,
        canvasId: canvasCtx?.canvasId,
        message: userMessageContent,
        attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
        context: {
          tutorMode: activeMode,
          gradeLevel: get().gradeLevel,
          taskContext: taskCtx,
          canvasContext: canvasCtx,
          customInstructions: customInst,
        },
      };

      const customKey =
        (typeof window !== 'undefined' ? localStorage.getItem('nexora_custom_gemini_key') : null) ||
        get().customApiKey;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-grade-level': get().gradeLevel,
        ...(customKey && customKey.trim() ? { 'x-gemini-api-key': customKey.trim() } : {}),
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorText = `Server responded with HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson.error) {
            errorText = errorJson.details
              ? `${errorJson.error}\n\n*Server detail: ${errorJson.details}*`
              : errorJson.error;
          } else if (errorJson.message) {
            errorText = errorJson.message;
          }
        } catch {
          const raw = await response.text().catch(() => '');
          if (raw) errorText = raw;
        }
        throw new Error(errorText);
      }

      // Check session ID header
      const returnedSessionId = response.headers.get('X-Chat-Session-Id') || activeSessionId;
      const sessionTitle = userMessageContent.slice(0, 45) || 'Brainstorming Session';

      if (!get().currentSession || get().currentSession?.id !== returnedSessionId) {
        const newSessionObj: ChatSession = {
          id: returnedSessionId,
          userId: 'current-user',
          taskId: taskCtx?.taskId,
          canvasId: canvasCtx?.canvasId,
          title: sessionTitle,
          tutorMode: activeMode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          currentSession: newSessionObj,
          sessions: state.sessions.some((s) => s.id === returnedSessionId)
            ? state.sessions
            : [newSessionObj, ...state.sessions],
        }));

        // Persist guest session list
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('nexora_guest_chat_sessions');
          const list: ChatSession[] = stored ? JSON.parse(stored) : [];
          if (!list.some((s) => s.id === returnedSessionId)) {
            localStorage.setItem('nexora_guest_chat_sessions', JSON.stringify([newSessionObj, ...list]));
          }
        }
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
        sessionId: returnedSessionId,
        userId: 'assistant',
        role: 'assistant' as ChatRole,
        content: fullAssistantText,
        citations,
        createdAt: new Date().toISOString(),
      };

      const updatedMessages = [...get().messages, finalAssistantMessage];

      set({
        messages: updatedMessages,
        streamingMessage: null,
        isSending: false,
        error: null,
      });

      // Synchronously cache complete messages (user + assistant) to localStorage
      setCachedMessages(returnedSessionId, updatedMessages);
    } catch (err) {
      console.error('[Chat Store Error]:', err);
      const errorMessageText = err instanceof Error ? err.message : 'AI failed to respond.';

      const errorAssistantMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sessionId: get().currentSession?.id || '',
        userId: 'assistant',
        role: 'assistant' as ChatRole,
        content: `⚠️ **AI failed to respond.**\n\n*Error: ${errorMessageText}*\n\nPlease check your \`GEMINI_API_KEY\` configuration in \`.env.local\` or try again.`,
        createdAt: new Date().toISOString(),
      };

      const messagesWithError = [...get().messages, errorAssistantMessage];
      set({
        messages: messagesWithError,
        error: errorMessageText,
        streamingMessage: null,
        isSending: false,
      });

      if (get().currentSession?.id) {
        setCachedMessages(get().currentSession!.id, messagesWithError);
      }
    }
  },

  clearMessages: () => set({ messages: [], streamingMessage: null }),
  clearError: () => set({ error: null }),
}));
