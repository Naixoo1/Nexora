import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';

import { auth } from '@/lib/auth';
import { SendChatMessageSchema } from '@/lib/validators/chat';
import { buildSystemPrompt } from '@/services/chat-prompt';
import { getOrCreateChatSession, saveChatMessage } from '@/services/chat';
import { errorResponse, validationErrorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const userId = session.user.id;
    const body: unknown = await req.json();
    const parsed = SendChatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { sessionId, taskId, canvasId, message, context } = parsed.data;

    // 1. Get or create session & save user message
    const chatSession = await getOrCreateChatSession(userId, {
      sessionId,
      taskId,
      canvasId,
      firstMessageTitle: message,
    });

    await saveChatMessage(chatSession.id, userId, 'user', message, context);

    // 2. Build dynamic academic system prompt
    const systemInstruction = buildSystemPrompt(context);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key') {
      const fallbackResponse = `**[Offline Mode Demo]**\n\nI have received your prompt:\n> *${message}*\n\nUnder mode **${context?.tutorMode || 'socratic'}**, let's analyze the problem step by step. Have you verified the initial boundary conditions?`;
      await saveChatMessage(chatSession.id, userId, 'assistant', fallbackResponse);

      return new Response(fallbackResponse, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Chat-Session-Id': chatSession.id,
        },
      });
    }

    // 3. Stream from Google GenAI SDK
    const ai = new GoogleGenAI({ apiKey });
    const responseStream = await ai.models.generateContentStream({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    let fullAssistantResponse = '';
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const chunkText = chunk.text || '';
            fullAssistantResponse += chunkText;
            controller.enqueue(encoder.encode(chunkText));
          }
          controller.close();

          // Save completed assistant response asynchronously
          saveChatMessage(chatSession.id, userId, 'assistant', fullAssistantResponse).catch((err) =>
            console.error('Failed to async save assistant message:', err)
          );
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Chat-Session-Id': chatSession.id,
      },
    });
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return errorResponse('Failed to process chat message', 500);
  }
}
