import { describe, it, expect, vi } from 'vitest';
import { buildGeminiMultiTurnContents } from '@/app/api/chat/route';
import { useChatStore } from '@/stores/useChatStore';
import type { ChatAttachment } from '@/types/chat';

describe('Multi-Turn Chat Context & Gemini Contents Transformation', () => {
  it('correctly constructs a single-turn Gemini user content block', () => {
    const contents = buildGeminiMultiTurnContents([], 'What is the derivative of x^2?');
    expect(contents).toHaveLength(1);
    expect(contents[0]).toEqual({
      role: 'user',
      parts: [{ text: 'What is the derivative of x^2?' }],
    });
  });

  it('correctly structures a 3-turn dialogue preserving context between turns', () => {
    // Simulating a 3-turn conversation:
    // Turn 1: User: "what is the root of 121" -> Assistant: "The square root of 121 is 11."
    // Turn 2: User: "is it 11" -> Assistant: "Yes, 11 * 11 = 121."
    // Turn 3: User: "what about 144"
    const history = [
      { role: 'user', content: 'what is the root of 121' },
      { role: 'assistant', content: 'The square root of 121 is 11.' },
      { role: 'user', content: 'is it 11' },
      { role: 'assistant', content: 'Yes, 11 * 11 = 121.' },
    ];

    const contents = buildGeminiMultiTurnContents(history, 'what about 144');

    expect(contents).toHaveLength(5);
    expect(contents[0]).toEqual({
      role: 'user',
      parts: [{ text: 'what is the root of 121' }],
    });
    expect(contents[1]).toEqual({
      role: 'model',
      parts: [{ text: 'The square root of 121 is 11.' }],
    });
    expect(contents[2]).toEqual({
      role: 'user',
      parts: [{ text: 'is it 11' }],
    });
    expect(contents[3]).toEqual({
      role: 'model',
      parts: [{ text: 'Yes, 11 * 11 = 121.' }],
    });
    expect(contents[4]).toEqual({
      role: 'user',
      parts: [{ text: 'what about 144' }],
    });
  });

  it('merges consecutive same-role turns to preserve valid Gemini turn alternations', () => {
    const messyHistory = [
      { role: 'user', content: 'First user thought' },
      { role: 'user', content: 'Second user thought' },
      { role: 'assistant', content: 'First AI reply' },
      { role: 'model', content: 'Second AI elaboration' },
    ];

    const contents = buildGeminiMultiTurnContents(messyHistory, 'Next question');

    expect(contents).toHaveLength(3);
    expect(contents[0].role).toBe('user');
    expect(contents[0].parts).toEqual([
      { text: 'First user thought' },
      { text: 'Second user thought' },
    ]);
    expect(contents[1].role).toBe('model');
    expect(contents[1].parts).toEqual([
      { text: 'First AI reply' },
      { text: 'Second AI elaboration' },
    ]);
    expect(contents[2].role).toBe('user');
    expect(contents[2].parts).toEqual([{ text: 'Next question' }]);
  });

  it('attaches multimodal media to the final user turn in multi-turn conversation', () => {
    const history = [
      { role: 'user', content: 'Hello tutor' },
      { role: 'assistant', content: 'Hello! How can I help you today?' },
    ];

    const attachments: ChatAttachment[] = [
      {
        id: 'att-1',
        name: 'geometry.png',
        type: 'image',
        mimeType: 'image/png',
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        size: 100,
      },
    ];

    const contents = buildGeminiMultiTurnContents(history, 'Analyze this triangle', attachments);

    expect(contents).toHaveLength(3);
    expect(contents[2].role).toBe('user');
    expect(contents[2].parts).toHaveLength(2);
    expect(contents[2].parts[0]).toEqual({ text: 'Analyze this triangle' });
    expect(contents[2].parts[1]).toEqual({
      inlineData: {
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        mimeType: 'image/png',
      },
    });
  });

  it('passes accumulated messages in useChatStore sendMessage payload', async () => {
    let capturedPayload: unknown = null;
    const fetchMock = vi.fn().mockImplementation(async (_url, options) => {
      if (options?.body) {
        capturedPayload = JSON.parse(options.body as string);
      }
      return {
        ok: true,
        headers: new Headers({ 'X-Chat-Session-Id': 'test-session-1' }),
        body: {
          getReader: () => {
            let done = false;
            return {
              read: async () => {
                if (!done) {
                  done = true;
                  return { done: false, value: new TextEncoder().encode('Answer from AI') };
                }
                return { done: true, value: undefined };
              },
            };
          },
        },
      };
    });

    global.fetch = fetchMock;

    useChatStore.setState({
      messages: [
        {
          id: 'msg-1',
          sessionId: 'test-session-1',
          userId: 'user-1',
          role: 'user',
          content: 'what is the root of 121',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          sessionId: 'test-session-1',
          userId: 'assistant',
          role: 'assistant',
          content: 'The root of 121 is 11.',
          createdAt: new Date().toISOString(),
        },
      ],
      currentSession: {
        id: 'test-session-1',
        userId: 'user-1',
        title: 'Math session',
        tutorMode: 'socratic',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isSending: false,
      attachments: [],
    });

    await useChatStore.getState().sendMessage('is it 11');

    expect(capturedPayload).not.toBeNull();
    const typedPayload = capturedPayload as {
      message: string;
      messages: Array<{ role: string; content: string }>;
    };

    expect(typedPayload.message).toBe('is it 11');
    expect(typedPayload.messages).toBeDefined();
    expect(typedPayload.messages.length).toBe(3);
    expect(typedPayload.messages[0]).toEqual({
      role: 'user',
      content: 'what is the root of 121',
    });
    expect(typedPayload.messages[1]).toEqual({
      role: 'assistant',
      content: 'The root of 121 is 11.',
    });
    expect(typedPayload.messages[2]).toEqual({
      role: 'user',
      content: 'is it 11',
    });
  });
});
