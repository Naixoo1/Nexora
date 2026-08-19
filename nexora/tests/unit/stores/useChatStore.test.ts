import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore, extractCitations } from '@/stores/useChatStore';
import type { TaskContextSnapshot, CanvasContextSnapshot } from '@/types/chat';

describe('extractCitations helper', () => {
  it('extracts node and task citations from text correctly', () => {
    const text = 'According to [[node:node-1:Integration Step]] and [[task:task-101:Calculus Homework]], we proceed.';
    const citations = extractCitations(text);

    expect(citations).toHaveLength(2);
    expect(citations[0]).toMatchObject({
      sourceType: 'canvas_node',
      referenceId: 'node-1',
      label: 'Integration Step',
    });
    expect(citations[1]).toMatchObject({
      sourceType: 'task',
      referenceId: 'task-101',
      label: 'Calculus Homework',
    });
  });

  it('handles citations without custom labels', () => {
    const text = 'Refer to [[node:node-xyz]] for the formula.';
    const citations = extractCitations(text);

    expect(citations).toHaveLength(1);
    expect(citations[0].referenceId).toBe('node-xyz');
    expect(citations[0].label).toBe('Node: node-xyz');
  });

  it('returns empty array when no citation tokens are present', () => {
    const text = 'Just regular mathematical text $E = mc^2$ without citations.';
    const citations = extractCitations(text);
    expect(citations).toHaveLength(0);
  });
});

describe('useChatStore', () => {
  beforeEach(() => {
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
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('controls drawer visibility and sets context on open', () => {
    const taskCtx: TaskContextSnapshot = {
      taskId: 'task-1',
      title: 'Physics Tryout',
      status: 'in_progress',
      priority: 'high',
      isOverdue: false,
      subtaskCount: 3,
      completedSubtaskCount: 1,
      milestoneProgressPct: 33,
    };

    useChatStore.getState().openDrawer({
      taskContext: taskCtx,
      tutorMode: 'olympiad',
    });

    expect(useChatStore.getState().isDrawerOpen).toBe(true);
    expect(useChatStore.getState().activeTutorMode).toBe('olympiad');
    expect(useChatStore.getState().taskContext).toEqual(taskCtx);

    useChatStore.getState().closeDrawer();
    expect(useChatStore.getState().isDrawerOpen).toBe(false);

    useChatStore.getState().toggleDrawer();
    expect(useChatStore.getState().isDrawerOpen).toBe(true);
  });

  it('updates tutor mode and workspace contexts', () => {
    useChatStore.getState().setTutorMode('step_breakdown');
    expect(useChatStore.getState().activeTutorMode).toBe('step_breakdown');

    const canvasCtx: CanvasContextSnapshot = {
      canvasId: 'canvas-1',
      canvasTitle: 'Parabolic Motion',
      derivationPath: [],
      activeVariables: [],
    };

    useChatStore.getState().setCanvasContext(canvasCtx);
    expect(useChatStore.getState().canvasContext).toEqual(canvasCtx);

    useChatStore.getState().clearContext();
    expect(useChatStore.getState().taskContext).toBeUndefined();
    expect(useChatStore.getState().canvasContext).toBeUndefined();
  });

  it('sends message and handles response streaming', async () => {
    const mockResponseText = 'Let us solve this step by step: [[node:node-42:Boundary Condition]]';
    
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('session-123'),
      },
      body: {
        getReader: () => {
          let readCount = 0;
          return {
            read: vi.fn().mockImplementation(async () => {
              if (readCount === 0) {
                readCount++;
                return { done: false, value: new TextEncoder().encode(mockResponseText) };
              }
              return { done: true, value: undefined };
            }),
          };
        },
      },
    });

    await useChatStore.getState().sendMessage('How do I integrate this function?');

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('How do I integrate this function?');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe(mockResponseText);
    expect(messages[1].citations).toHaveLength(1);
    expect(messages[1].citations![0].referenceId).toBe('node-42');
  });

  it('clears messages and errors', () => {
    useChatStore.setState({
      messages: [{ id: '1', sessionId: 's1', userId: 'u1', role: 'user', content: 'test', createdAt: new Date() }],
      error: 'Some network error',
    });

    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toHaveLength(0);

    useChatStore.getState().clearError();
    expect(useChatStore.getState().error).toBeNull();
  });
});
