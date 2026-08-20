import { create } from 'zustand';
import type {
  AcademicTutorMode,
  ChatMessage,
  ChatSession,
  ChatSessionWithMessages,
  TaskContextSnapshot,
  CanvasContextSnapshot,
  ChatSourceCitation,
  ChatAttachment,
  ChatAttachmentMeta,
  ChatRole,
} from '@/types/chat';
import type { ApiResponse } from '@/types/canvas';

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

  // Actions - Sessions & Messages
  fetchSessions: (params?: { taskId?: string; canvasId?: string }) => Promise<void>;
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

      // Access canvas store dynamically to avoid circular import issues
      const { useCanvasStore } = require('./useCanvasStore');
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

  fetchSessions: async (params) => {
    try {
      const query = new URLSearchParams();
      if (params?.taskId) query.set('taskId', params.taskId);
      if (params?.canvasId) query.set('canvasId', params.canvasId);

      const response = await fetch(`/api/chat/sessions?${query.toString()}`);
      const json: ApiResponse<{ items: ChatSession[] }> = await response.json();

      if (response.ok && json.success && json.data) {
        set({ sessions: json.data.items || [] });
      }
    } catch (err) {
      console.warn('Failed to fetch chat sessions:', err);
    }
  },

  selectSession: async (sessionId: string) => {
    set({ isLoadingHistory: true, error: null });
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`);
      const json: ApiResponse<ChatSessionWithMessages> = await response.json();

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Failed to load session');
      }

      set({
        currentSession: json.data,
        messages: json.data.messages || [],
        activeTutorMode: json.data.tutorMode || 'socratic',
        isLoadingHistory: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error loading chat history';
      set({ error: msg, isLoadingHistory: false });
    }
  },

  createSession: async (title = 'New Brainstorm Session', taskId, canvasId) => {
    try {
      const payload = {
        title,
        taskId: taskId || get().taskContext?.taskId,
        canvasId: canvasId || get().canvasContext?.canvasId,
        tutorMode: get().activeTutorMode,
      };

      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<ChatSession> = await response.json();

      if (!response.ok || !json.success || !json.data) {
        // Fallback for guest mode: create local in-memory session
        const guestSession: ChatSession = {
          id: `guest-${Date.now()}`,
          userId: 'guest',
          title,
          tutorMode: get().activeTutorMode,
          taskId: taskId || get().taskContext?.taskId,
          canvasId: canvasId || get().canvasContext?.canvasId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({
          currentSession: guestSession,
          messages: [],
        });
        return guestSession;
      }

      const newSession = json.data;
      set((state) => ({
        sessions: [newSession, ...state.sessions.filter((s) => s.id !== newSession.id)],
        currentSession: newSession,
        messages: [],
      }));

      return newSession;
    } catch (err) {
      console.warn('Fallback to local guest chat session:', err);
      const guestSession: ChatSession = {
        id: `guest-${Date.now()}`,
        userId: 'guest',
        title,
        tutorMode: get().activeTutorMode,
        taskId: taskId || get().taskContext?.taskId,
        canvasId: canvasId || get().canvasContext?.canvasId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set({
        currentSession: guestSession,
        messages: [],
      });
      return guestSession;
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (!response.ok) return false;

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
    const activeMode = get().activeTutorMode;
    const taskCtx = get().taskContext;
    const canvasCtx = get().canvasContext;
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
