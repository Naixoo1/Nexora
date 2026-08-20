import { NextRequest } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';

import { auth } from '@/lib/auth';
import { SendChatMessageSchema } from '@/lib/validators/chat';
import { buildSystemPrompt } from '@/services/chat-prompt';
import { getOrCreateChatSession, saveChatMessage } from '@/services/chat';
import { validationErrorResponse } from '@/lib/api-response';
import type { ChatAttachment } from '@/types/chat';

/**
 * Strip the data URI prefix from a base64 string if present.
 * e.g. "data:image/jpeg;base64,/9j/4AAQ..." → "/9j/4AAQ..."
 */
function stripBase64Prefix(data: string): string {
  const commaIndex = data.indexOf(',');
  if (commaIndex !== -1 && data.startsWith('data:')) {
    return data.slice(commaIndex + 1);
  }
  return data;
}

/**
 * Build a multipart Part[] array for the Gemini SDK from user message and attachments.
 * - Images and PDFs are sent as inlineData (Gemini natively processes both).
 * - Text files are appended as Part.text blocks.
 */
function buildGeminiContentParts(
  message: string,
  attachments?: ChatAttachment[]
): Part[] {
  const parts: Part[] = [{ text: message }];

  if (!attachments || attachments.length === 0) {
    return parts;
  }

  for (const att of attachments) {
    switch (att.type) {
      case 'image':
      case 'pdf': {
        // Gemini natively processes images and PDFs via inlineData
        const cleanData = stripBase64Prefix(att.data);
        parts.push({
          inlineData: {
            data: cleanData,
            mimeType: att.mimeType,
          },
        });
        break;
      }
      case 'text': {
        // Text files are injected as supplementary context blocks
        parts.push({
          text: `\n---\n### Attached File: "${att.name}"\n${att.data}\n---`,
        });
        break;
      }
    }
  }

  return parts;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // 1. Attempt to get session from Better-Auth (support Guest mode if unauthenticated)
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch (authErr) {
      console.warn('[Chat API]: Session check unauthenticated, proceeding as Guest:', authErr);
    }

    const body: unknown = await req.json();
    const parsed = SendChatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { sessionId, taskId, canvasId, message, mode, context, attachments } = parsed.data;

    // Resolve context merging top-level mode if provided
    const resolvedContext = {
      ...(context || { tutorMode: 'socratic' as const }),
      tutorMode: mode || context?.tutorMode || 'socratic',
    };

    // 2. Check GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key') {
      console.error('[Chat API Error]: Missing or invalid GEMINI_API_KEY in environment variables.');
      return Response.json(
        { error: 'Missing GEMINI_API_KEY in environment variables. Please check your .env.local configuration.' },
        { status: 500 }
      );
    }

    // 3. If authenticated user, persist session & user message to database
    let chatSessionId = sessionId || `guest-${Date.now()}`;
    if (userId) {
      try {
        const chatSession = await getOrCreateChatSession(userId, {
          sessionId,
          taskId,
          canvasId,
          firstMessageTitle: message,
        });
        chatSessionId = chatSession.id;

        await saveChatMessage(
          chatSession.id,
          userId,
          'user',
          message,
          resolvedContext,
          attachments as ChatAttachment[] | undefined
        );
      } catch (dbErr) {
        console.error('[Chat API Error]: Failed to persist user chat message to database:', dbErr);
      }
    }

    // 4. Build dynamic academic system prompt and parts
    const systemInstruction = buildSystemPrompt(resolvedContext);
    const contentParts = buildGeminiContentParts(
      message,
      attachments as ChatAttachment[] | undefined
    );

    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    // 5. Initialize Google GenAI and launch stream
    const ai = new GoogleGenAI({ apiKey });
    let responseStream;

    try {
      responseStream = await ai.models.generateContentStream({
        model,
        contents: contentParts,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      });
    } catch (modelError) {
      console.error(`[Chat API Error]: Failed to generate content stream with model ${model}:`, modelError);
      return Response.json(
        {
          error:
            modelError instanceof Error
              ? modelError.message
              : 'Failed to initialize AI stream from Gemini API.',
        },
        { status: 500 }
      );
    }

    let fullAssistantResponse = '';
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const chunkText = chunk.text || '';
            if (chunkText) {
              fullAssistantResponse += chunkText;
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();

          // Save completed assistant response asynchronously if authenticated
          if (userId && fullAssistantResponse.trim()) {
            saveChatMessage(chatSessionId, userId, 'assistant', fullAssistantResponse).catch((err) =>
              console.error('[Chat API Error]: Failed to async save assistant message:', err)
            );
          }
        } catch (streamError) {
          console.error('[Chat API Error during streaming]:', streamError);
          const errorNotice = `\n\n⚠️ *Streaming error: ${
            streamError instanceof Error ? streamError.message : 'Connection interrupted'
          }*`;
          controller.enqueue(encoder.encode(errorNotice));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Chat-Session-Id': chatSessionId,
      },
    });
  } catch (error) {
    console.error('[Chat API Fatal Error]:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process chat message',
      },
      { status: 500 }
    );
  }
}
