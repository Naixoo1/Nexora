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
      attachments: [],
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

  describe('Multimodal Attachments Management', () => {
    it('should add, remove, and clear attachments', () => {
      const att1 = {
        id: 'att-1',
        name: 'hw1.jpg',
        type: 'image' as const,
        mimeType: 'image/jpeg',
        data: 'base64data1',
        size: 1024,
      };
      const att2 = {
        id: 'att-2',
        name: 'notes.pdf',
        type: 'pdf' as const,
        mimeType: 'application/pdf',
        data: 'base64data2',
        size: 2048,
      };

      useChatStore.getState().addAttachment(att1);
      useChatStore.getState().addAttachment(att2);

      expect(useChatStore.getState().attachments).toHaveLength(2);
      expect(useChatStore.getState().attachments[0].name).toBe('hw1.jpg');

      useChatStore.getState().removeAttachment('att-1');
      expect(useChatStore.getState().attachments).toHaveLength(1);
      expect(useChatStore.getState().attachments[0].id).toBe('att-2');

      useChatStore.getState().clearAttachments();
      expect(useChatStore.getState().attachments).toHaveLength(0);
    });

    it('should limit attachments to maximum 5 items', () => {
      for (let i = 1; i <= 5; i++) {
        useChatStore.getState().addAttachment({
          id: `att-${i}`,
          name: `file${i}.png`,
          type: 'image',
          mimeType: 'image/png',
          data: 'data',
          size: 100,
        });
      }

      expect(useChatStore.getState().attachments).toHaveLength(5);

      // Attempt 6th
      useChatStore.getState().addAttachment({
        id: 'att-6',
        name: 'file6.png',
        type: 'image',
        mimeType: 'image/png',
        data: 'data',
        size: 100,
      });

      expect(useChatStore.getState().attachments).toHaveLength(5);
      expect(useChatStore.getState().error).toBe('Maximum 5 attachments allowed per message.');
    });

    it('should send message with attachments and clear attachment buffer', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'X-Chat-Session-Id': mockSessionId }),
        body: createMockStream(['Image analysis result']),
      });
      vi.stubGlobal('fetch', mockFetch);

      useChatStore.getState().addAttachment({
        id: 'att-calc',
        name: 'integral.png',
        type: 'image',
        mimeType: 'image/png',
        data: 'base64calc',
        size: 2048,
      });

      await useChatStore.getState().sendMessage('Please solve this step');

      // Attachments buffer in store should be reset
      expect(useChatStore.getState().attachments).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalled();

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.attachments).toHaveLength(1);
      expect(requestBody.attachments[0].name).toBe('integral.png');
    });

    it('should default user message prompt when sending attachment with empty text content', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'X-Chat-Session-Id': mockSessionId }),
        body: createMockStream(['PDF analysis complete.']),
      });
      vi.stubGlobal('fetch', mockFetch);

      useChatStore.getState().addAttachment({
        id: 'att-pdf',
        name: 'syllabus.pdf',
        type: 'pdf',
        mimeType: 'application/pdf',
        data: 'base64pdf',
        size: 4096,
      });

      // Send with empty content
      await useChatStore.getState().sendMessage('');

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.message).toBe('Analyze the attached image/document.');
      expect(requestBody.attachments).toHaveLength(1);
      expect(requestBody.attachments[0].name).toBe('syllabus.pdf');

      // Check temporary message in store messages
      const lastMsg = useChatStore.getState().messages[0];
      expect(lastMsg.content).toBe('Analyze the attached image/document.');
      expect(lastMsg.attachments).toEqual([
        {
          id: 'att-pdf',
          name: 'syllabus.pdf',
          type: 'pdf',
          mimeType: 'application/pdf',
          size: 4096,
        },
      ]);
    });

    it('should not send message if both content and attachments are empty', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      await useChatStore.getState().sendMessage('   ');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(useChatStore.getState().messages).toHaveLength(0);
    });
  });
});


