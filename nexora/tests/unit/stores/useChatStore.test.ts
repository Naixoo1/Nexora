import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useChatStore, extractCitations } from '@/stores/useChatStore';
import {
  mockSessionId,
  mockTaskId,
  mockChatSession,
  mockChatSessionWithMessages,
  mockTaskContext,
  mockCanvasContext,
  mockUserMessage,
  mockAssistantMessage,
  createMockStream,
} from '../../mocks/chatMocks';
import type { ChatSession } from '@/types/chat';

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useChatStore.setState({
      isDrawerOpen: false,
      activeTutorMode: 'socratic',
      taskContext: undefined,
      canvasContext: undefined,
      customInstructions: undefined,
      sessions: [],
      currentSession: null,
      messages: [],
      streamingMessage: null,
      isSending: false,
      isLoadingHistory: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Citation Extraction Helper (extractCitations)', () => {
    it('should extract node, task, and formula bracket citations with custom labels', () => {
      // Arrange
      const text =
        'Berdasarkan [[node:node-step-1:Dekomposisi Kecepatan]] dan [[task:task-1:Tugas Bernoulli]], kita peroleh formula [[formula:f-1:E=mc^2]].';

      // Act
      const citations = extractCitations(text);

      // Assert
      expect(citations).toHaveLength(3);
      expect(citations[0]).toMatchObject({
        sourceType: 'canvas_node',
        referenceId: 'node-step-1',
        label: 'Dekomposisi Kecepatan',
      });
      expect(citations[1]).toMatchObject({
        sourceType: 'task',
        referenceId: 'task-1',
        label: 'Tugas Bernoulli',
      });
      expect(citations[2]).toMatchObject({
        sourceType: 'formula',
        referenceId: 'f-1',
        label: 'E=mc^2',
      });
    });

    it('should generate fallback labels when label is omitted in citation brackets', () => {
      // Arrange
      const text = 'Lihat [[node:node-42]] dan [[task:task-99]].';

      // Act
      const citations = extractCitations(text);

      // Assert
      expect(citations).toHaveLength(2);
      expect(citations[0].label).toBe('Node: node-42');
      expect(citations[1].label).toBe('Task: task-99');
    });

    it('should return empty array when text contains no bracket citations', () => {
      // Arrange
      const text = 'Ini adalah teks matematika murni tanpa kutipan: $\\int x dx = \\frac{x^2}{2}$.';

      // Act
      const citations = extractCitations(text);

      // Assert
      expect(citations).toEqual([]);
    });
  });

  describe('Drawer Controls & Context Management', () => {
    it('should toggle and control drawer visibility', () => {
      // Arrange & Act: Toggle open
      useChatStore.getState().toggleDrawer();
      expect(useChatStore.getState().isDrawerOpen).toBe(true);

      // Act: Toggle closed
      useChatStore.getState().toggleDrawer();
      expect(useChatStore.getState().isDrawerOpen).toBe(false);

      // Act: Explicit close
      useChatStore.getState().openDrawer();
      expect(useChatStore.getState().isDrawerOpen).toBe(true);
      useChatStore.getState().closeDrawer();
      expect(useChatStore.getState().isDrawerOpen).toBe(false);
    });

    it('should open drawer with context options and initial prompt', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'X-Chat-Session-Id': mockSessionId }),
        body: createMockStream(['Halo! Mari kita diskusikan.']),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      useChatStore.getState().openDrawer({
        taskContext: mockTaskContext,
        canvasContext: mockCanvasContext,
        tutorMode: 'olympiad',
        initialPrompt: 'Jelaskan teorema Rolle.',
      });

      // Assert
      const state = useChatStore.getState();
      expect(state.isDrawerOpen).toBe(true);
      expect(state.taskContext).toEqual(mockTaskContext);
      expect(state.canvasContext).toEqual(mockCanvasContext);
      expect(state.activeTutorMode).toBe('olympiad');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should update individual context elements and clear context cleanly', () => {
      // Arrange & Act
      useChatStore.getState().setTutorMode('step_breakdown');
      useChatStore.getState().setTaskContext(mockTaskContext);
      useChatStore.getState().setCanvasContext(mockCanvasContext);
      useChatStore.getState().setCustomInstructions('Singkat dan padat.');

      // Assert
      let state = useChatStore.getState();
      expect(state.activeTutorMode).toBe('step_breakdown');
      expect(state.taskContext).toEqual(mockTaskContext);
      expect(state.canvasContext).toEqual(mockCanvasContext);
      expect(state.customInstructions).toBe('Singkat dan padat.');

      // Act: Clear context
      useChatStore.getState().clearContext();
      state = useChatStore.getState();
      expect(state.taskContext).toBeUndefined();
      expect(state.canvasContext).toBeUndefined();
      expect(state.customInstructions).toBeUndefined();
    });
  });

  describe('Session Management Actions', () => {
    it('should fetch and load chat sessions when fetchSessions succeeds', async () => {
      // Arrange
      const mockSessions: ChatSession[] = [mockChatSession];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { items: mockSessions },
          message: 'Success',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useChatStore.getState().fetchSessions({ taskId: mockTaskId });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`taskId=${mockTaskId}`));
      expect(useChatStore.getState().sessions).toEqual(mockSessions);
    });

    it('should select session and load message history and tutorMode when selectSession succeeds', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockChatSessionWithMessages,
          message: 'History loaded',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useChatStore.getState().selectSession(mockSessionId);

      // Assert
      const state = useChatStore.getState();
      expect(mockFetch).toHaveBeenCalledWith(`/api/chat/sessions/${mockSessionId}`);
      expect(state.currentSession?.id).toBe(mockSessionId);
      expect(state.messages).toHaveLength(2);
      expect(state.activeTutorMode).toBe(mockChatSessionWithMessages.tutorMode);
      expect(state.isLoadingHistory).toBe(false);
    });

    it('should set error state when selectSession fails', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          data: null,
          message: 'Session not found',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useChatStore.getState().selectSession('non-existent-id');

      // Assert
      const state = useChatStore.getState();
      expect(state.error).toBe('Session not found');
      expect(state.isLoadingHistory).toBe(false);
    });

    it('should create new session, prepend to sessions list, and activate it', async () => {
      // Arrange
      const newSession: ChatSession = {
        id: 'new-session-id',
        userId: 'user-1',
        title: 'Diskusi Kalkulus Multivariabel',
        tutorMode: 'step_breakdown',
        createdAt: '2026-08-19T11:00:00.000Z',
        updatedAt: '2026-08-19T11:00:00.000Z',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: newSession,
          message: 'Created',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const result = await useChatStore.getState().createSession('Diskusi Kalkulus Multivariabel');

      // Assert
      expect(result).toEqual(newSession);
      const state = useChatStore.getState();
      expect(state.sessions).toContainEqual(newSession);
      expect(state.currentSession).toEqual(newSession);
      expect(state.messages).toEqual([]);
    });

    it('should delete session, remove from sessions list, and reset currentSession if active', async () => {
      // Arrange
      useChatStore.setState({
        sessions: [mockChatSession],
        currentSession: mockChatSession,
        messages: [mockUserMessage, mockAssistantMessage],
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Deleted' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      const result = await useChatStore.getState().deleteSession(mockSessionId);

      // Assert
      expect(result).toBe(true);
      const state = useChatStore.getState();
      expect(state.sessions).toHaveLength(0);
      expect(state.currentSession).toBeNull();
      expect(state.messages).toHaveLength(0);
    });
  });

  describe('Messaging & AI Streaming (sendMessage)', () => {
    it('should send user message, stream assistant chunks, parse citations, and append final assistant message', async () => {
      // Arrange
      const streamChunks = [
        'Mari kita lihat ',
        '[[node:node-root-1:Problem Root]].\n',
        '$$R = \\frac{v_0^2 \\sin(2\\theta)}{g}$$\n',
        'Sudut maksimum tercapai saat $\\theta = 45^\\circ$.',
      ];

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'X-Chat-Session-Id': mockSessionId }),
        body: createMockStream(streamChunks),
      });
      vi.stubGlobal('fetch', mockFetch);

      useChatStore.setState({
        taskContext: mockTaskContext,
        canvasContext: mockCanvasContext,
      });

      // Act
      await useChatStore.getState().sendMessage('Berapa sudut tembak optimum?');

      // Assert
      const state = useChatStore.getState();
      expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }));
      expect(state.messages).toHaveLength(2); // User + Assistant

      // User Message Check
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('Berapa sudut tembak optimum?');
      expect(state.messages[0].contextSnapshot?.taskContext).toEqual(mockTaskContext);

      // Assistant Message Check
      const assistantMsg = state.messages[1];
      expect(assistantMsg.role).toBe('assistant');
      expect(assistantMsg.content).toContain('Sudut maksimum tercapai saat $\\theta = 45^\\circ$.');
      expect(assistantMsg.citations).toHaveLength(1);
      expect(assistantMsg.citations?.[0].referenceId).toBe('node-root-1');
      expect(assistantMsg.citations?.[0].label).toBe('Problem Root');

      expect(state.isSending).toBe(false);
      expect(state.streamingMessage).toBeNull();
    });

    it('should handle non-streaming response body fallback if reader is absent', async () => {
      // Arrange
      const fullText = 'Jawaban teks lengkap langsung.';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        body: null,
        text: async () => fullText,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useChatStore.getState().sendMessage('Pertanyaan ringkas');

      // Assert
      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[1].content).toBe(fullText);
      expect(state.isSending).toBe(false);
    });

    it('should set error state and reset isSending when fetch fails with non-ok response', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Payload validation error' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await useChatStore.getState().sendMessage('Test prompt');

      // Assert
      const state = useChatStore.getState();
      expect(state.error).toBe('Payload validation error');
      expect(state.isSending).toBe(false);
      expect(state.streamingMessage).toBeNull();
    });

    it('should ignore empty prompt or when sending is already in progress', async () => {
      // Arrange
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      // Act: Empty prompt
      await useChatStore.getState().sendMessage('   ');
      expect(mockFetch).not.toHaveBeenCalled();

      // Act: Sending already in progress
      useChatStore.setState({ isSending: true });
      await useChatStore.getState().sendMessage('Pesan baru');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should clear messages and clear errors with utility actions', () => {
      // Arrange
      useChatStore.setState({
        messages: [mockUserMessage],
        error: 'Network failure',
      });

      // Act
      useChatStore.getState().clearMessages();
      useChatStore.getState().clearError();

      // Assert
      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.error).toBeNull();
    });
  });
});
