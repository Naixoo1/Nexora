import { NextRequest } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';

import { auth } from '@/lib/auth';
import { SendChatMessageSchema } from '@/lib/validators/chat';
import { buildSystemPrompt } from '@/services/chat-prompt';
import { getOrCreateChatSession, saveChatMessage } from '@/services/chat';
import { getModelCascade, delayWithJitter } from '@/services/ai-cascade';
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

    // 5. Initialize Google GenAI and launch stream with resilient model fallback cascade
    const ai = new GoogleGenAI({ apiKey });
    const cascade = getModelCascade();
    let responseStream;
    let usedModel = cascade[0];
    let lastError: unknown = null;

    for (let i = 0; i < cascade.length; i++) {
      const candidateModel = cascade[i];
      try {
        responseStream = await ai.models.generateContentStream({
          model: candidateModel,
          contents: contentParts,
          config: {
            systemInstruction,
            temperature: 0.4,
          },
        });
        usedModel = candidateModel;
        break; // Successfully launched stream
      } catch (modelError) {
        lastError = modelError;
        const errMsg = modelError instanceof Error ? modelError.message : String(modelError);
        console.warn(
          `[Chat API Model Cascade]: Model "${candidateModel}" failed (attempt ${i + 1}/${cascade.length}): ${errMsg}`
        );

        if (i < cascade.length - 1) {
          await delayWithJitter(300, 200);
        }
      }
    }

    if (!responseStream) {
      console.error('[Chat API Error]: All fallback models in cascade failed. Last error:', lastError);
      return Response.json(
        {
          error:
            'AI servers are temporarily congested due to high demand. Please retry in a moment.',
        },
        { status: 503 }
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
          // Synchronously persist completed assistant response to Neon DB before terminating stream
          if (userId && fullAssistantResponse.trim()) {
            try {
              await saveChatMessage(chatSessionId, userId, 'assistant', fullAssistantResponse);
            } catch (saveErr) {
              console.error('[Chat API Error]: Failed to persist assistant message to database:', saveErr);
            }
          }

          controller.close();
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
