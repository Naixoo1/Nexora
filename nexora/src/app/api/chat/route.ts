import { NextRequest } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';

import { auth } from '@/lib/auth';
import { SendChatMessageSchema } from '@/lib/validators/chat';
import { buildSystemPrompt } from '@/services/chat-prompt';
import { getOrCreateChatSession, saveChatMessage } from '@/services/chat';
import {
  getApiKeyPool,
  getModelCascade,
  isKeyExhaustedOrInvalid,
  isTransientError,
  delayWithJitter,
} from '@/services/ai-cascade';
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

    // 2. Resolve Multi-Key Pool (supports client-provided BYOK x-gemini-api-key)
    const customClientKey = req.headers.get('x-gemini-api-key');
    const keyPool = getApiKeyPool(customClientKey);

    if (keyPool.length === 0) {
      console.error('[Chat API Error]: No valid Gemini API keys found in pool or request header.');
      return Response.json(
        {
          error:
            'Missing GEMINI_API_KEY. Please provide a custom API key in Chat Settings or configure .env.local.',
        },
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

    // 5. Initialize Google GenAI with Multi-Key Pool and Resilient Model Cascade
    const cascade = getModelCascade();
    let responseStream;
    let usedModel = cascade[0];
    let usedKeyIndex = 0;
    let lastError: unknown = null;

    // Model Cascade Loop
    for (let m = 0; m < cascade.length; m++) {
      const candidateModel = cascade[m];

      // Key Rotation Loop for candidate model
      for (let k = 0; k < keyPool.length; k++) {
        const currentKey = keyPool[k];
        try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          responseStream = await ai.models.generateContentStream({
            model: candidateModel,
            contents: contentParts,
            config: {
              systemInstruction,
              temperature: 0.4,
            },
          });
          usedModel = candidateModel;
          usedKeyIndex = k;
          break; // Successfully started stream
        } catch (apiError) {
          lastError = apiError;
          const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
          console.error(
            `[AI Stream Error] Key Index: ${k}, Model: ${candidateModel}:`,
            errMsg
          );

          // If quota exhausted or key invalid, rotate to next key in pool
          if (isKeyExhaustedOrInvalid(apiError) && k < keyPool.length - 1) {
            console.warn(
              `[AI Key Rotation] Rotating from Key index ${k} to ${k + 1} for model ${candidateModel}`
            );
            await delayWithJitter(200, 100);
            continue;
          }

          // If transient server error (503 / 404), advance to next model in cascade
          if (isTransientError(apiError)) {
            break;
          }
        }
      }

      if (responseStream) {
        break; // Successfully launched stream with candidate model & key
      }

      if (m < cascade.length - 1) {
        await delayWithJitter(300, 150);
      }
    }

    if (!responseStream) {
      console.error(
        `[Chat API Error]: All key pool attempts (${keyPool.length} keys) and model cascade attempts (${cascade.length} models) failed. Last error:`,
        lastError
      );
      return Response.json(
        {
          error:
            'AI servers are temporarily congested or quota exceeded. Please retry in a moment or add a custom Gemini API key in Settings.',
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
