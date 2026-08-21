import { NextRequest } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';

import { auth } from '@/lib/auth';
import { SendChatMessageSchema } from '@/lib/validators/chat';
import { buildSystemPrompt } from '@/services/chat-prompt';
import { getOrCreateChatSession, saveChatMessage, getChatSessionWithMessages } from '@/services/chat';
import {
  getApiKeyPool,
  getModelCascade,
  isKeyExhaustedOrInvalid,
  isTransientError,
  delayWithJitter,
  streamOpenRouterCompletion,
  streamGroqCompletion,
  pruneConversationHistory,
  type OpenRouterChatMessage,
  type GroqChatMessage,
} from '@/services/ai-cascade';
import { getComplexityConfig } from '@/services/ai-classifier';
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

    if (keyPool.length === 0 && !process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY) {
      console.error('[Chat API Error]: No valid Gemini API keys, OpenRouter, or Groq fallback found.');
      return Response.json(
        {
          error:
            'Missing AI API credentials. Please provide a custom Gemini API key in Chat Settings or configure server environment variables.',
        },
        { status: 500 }
      );
    }

    // 3. If authenticated user, fetch history, prune, and persist new user message to database
    let chatSessionId = sessionId || `guest-${Date.now()}`;
    let previousHistory: { role: string; content: string }[] = [];

    if (userId) {
      try {
        const chatSession = await getOrCreateChatSession(userId, {
          sessionId,
          taskId,
          canvasId,
          firstMessageTitle: message,
        });
        chatSessionId = chatSession.id;

        // Fetch previous messages for smart history pruning
        if (sessionId) {
          const sessionWithMsgs = await getChatSessionWithMessages(sessionId, userId);
          if (sessionWithMsgs?.messages) {
            previousHistory = sessionWithMsgs.messages.map((m) => ({
              role: m.role,
              content: m.content,
            }));
          }
        }

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

    // Smart History Pruning: limit to last 6 messages and strip heavy base64
    const prunedHistory = pruneConversationHistory(previousHistory, 6);

    // 4. Build dynamic academic system prompt and parts
    const systemInstruction = buildSystemPrompt(resolvedContext);
    const contentParts = buildGeminiContentParts(
      message,
      attachments as ChatAttachment[] | undefined
    );

    // Dynamic Prompt Complexity Classification & Parameter Optimization
    const complexityConfig = getComplexityConfig(message);
    console.log(`[AI Latency Routing] Classified Prompt Complexity: ${complexityConfig.tier.toUpperCase()} (${complexityConfig.statusLabel})`);

    // 5. Multi-Provider Fallback Cascade Pipeline
    const cascade = getModelCascade();
    let responseStream: AsyncIterable<{ text?: string | null }> | null = null;
    let fallbackStream: ReadableStream<string> | null = null;
    let usedModel: string = cascade[0];
    let usedKeyIndex = 0;
    let lastError: unknown = null;

    // Tier 1: Gemini Multi-Key Pool & Sanitized Model Cascade
    for (let m = 0; m < cascade.length; m++) {
      const candidateModel = cascade[m];

      for (let k = 0; k < keyPool.length; k++) {
        const currentKey = keyPool[k];
        try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          const geminiConfig: Record<string, unknown> = {
            systemInstruction,
            temperature: complexityConfig.temperature,
            maxOutputTokens: complexityConfig.maxOutputTokens,
          };

          if (complexityConfig.thinkingBudget !== undefined) {
            geminiConfig.thinkingConfig = {
              thinkingBudget: complexityConfig.thinkingBudget,
            };
          }

          responseStream = await ai.models.generateContentStream({
            model: candidateModel,
            contents: contentParts,
            config: geminiConfig,
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

    // Tier 2: OpenRouter Free Tier Fallback Engine
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!responseStream && openRouterKey && openRouterKey.trim() && !openRouterKey.startsWith('your-')) {
      const orCandidates = ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free'];
      for (const orModel of orCandidates) {
        try {
          console.log(`[AI Multi-Provider Cascade] Gemini exhausted, activating OpenRouter fallback with ${orModel}`);
          const orMessages: OpenRouterChatMessage[] = [
            { role: 'system', content: systemInstruction },
            ...prunedHistory.map((m) => ({
              role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
              content: m.content,
            })),
            { role: 'user', content: message },
          ];

          fallbackStream = await streamOpenRouterCompletion(
            orMessages,
            orModel,
            openRouterKey,
            {
              temperature: complexityConfig.temperature,
              maxTokens: complexityConfig.maxOutputTokens,
            }
          );
          usedModel = `openrouter/${orModel}`;
          break;
        } catch (orErr) {
          console.warn(`[AI OpenRouter Model ${orModel} Error]:`, orErr);
          lastError = orErr;
        }
      }
    }

    // Tier 3: Groq High-Speed Fallback Engine
    const groqKey = process.env.GROQ_API_KEY;
    if (!responseStream && !fallbackStream && groqKey && groqKey.trim() && !groqKey.startsWith('your-')) {
      try {
        console.log('[AI Multi-Provider Cascade] Activating Groq fallback with llama-3.3-70b-versatile');

        const groqMessages: GroqChatMessage[] = [
          { role: 'system', content: systemInstruction },
          ...prunedHistory.map((m) => ({
            role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
            content: m.content,
          })),
          { role: 'user', content: message },
        ];

        fallbackStream = await streamGroqCompletion(
          groqMessages,
          'llama-3.3-70b-versatile',
          groqKey,
          {
            temperature: complexityConfig.temperature,
            maxTokens: complexityConfig.maxOutputTokens,
          }
        );
        usedModel = 'groq/llama-3.3-70b-versatile';
      } catch (groqErr) {
        console.error('[AI Groq Fallback Fatal Error]:', groqErr);
        lastError = groqErr;
      }
    }

    if (!responseStream && !fallbackStream) {
      console.error(
        `[Chat API Error]: All key pool attempts (${keyPool.length} keys), model cascades, and fallback providers failed.`
      );
      console.error('[AI Chat Fatal] Last caught error:', lastError);

      const errorDetails =
        lastError instanceof Error ? lastError.message : String(lastError || 'Unknown error');

      return Response.json(
        {
          error:
            'AI servers are temporarily congested or quota exceeded. Please retry in a moment or verify your custom Gemini API key in Settings.',
          details: errorDetails,
        },
        { status: 503 }
      );
    }

    let fullAssistantResponse = '';
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (fallbackStream) {
            const reader = fallbackStream.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                fullAssistantResponse += value;
                controller.enqueue(encoder.encode(value));
              }
            }
          } else if (responseStream) {
            for await (const chunk of responseStream) {
              const chunkText = chunk.text || '';
              if (chunkText) {
                fullAssistantResponse += chunkText;
                controller.enqueue(encoder.encode(chunkText));
              }
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
        'X-Prompt-Complexity': complexityConfig.tier,
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
