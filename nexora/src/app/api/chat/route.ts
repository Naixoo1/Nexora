import { NextRequest } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';

import { auth } from '@/lib/auth';
import { SendChatMessageSchema } from '@/lib/validators/chat';
import { buildSystemPrompt } from '@/services/chat-prompt';
import { getOrCreateChatSession, saveChatMessage, getChatSessionWithMessages } from '@/services/chat';
import { getUserMemory } from '@/services/memory';
import {
  getApiKeyPool,
  getModelCascade,
  isKeyExhaustedOrInvalid,
  isTransientError,
  delayWithJitter,
  streamOpenRouterCompletion,
  streamGroqCompletion,
  pruneConversationHistory,
  createReasoningFilterTransform,
  type OpenRouterChatMessage,
  type GroqChatMessage,
} from '@/services/ai-cascade';
import { getComplexityConfig } from '@/services/ai-classifier';
import {
  isCacheEligible,
  generatePromptCacheKey,
  getCachedResponse,
  setCachedResponse,
} from '@/services/ai-cache';
import {
  isProviderAvailable,
  recordProviderSuccess,
  recordProviderFailure,
  getCircuitState,
} from '@/services/ai-circuit-breaker';
import { validationErrorResponse } from '@/lib/api-response';
import { classifyStudyContext } from '@/services/study-planner-classifier';
import { normalizePhoneticQuery } from '@/services/stt-phonetic-aligner';
import type { ChatAttachment } from '@/types/chat';
import type { GradeLevel, SubjectCategory } from '@/types/planner';
import type { UserMemoryPayload } from '@/types/memory';

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

export interface GeminiContentTurn {
  role: 'user' | 'model';
  parts: Part[];
}

/**
 * Builds the complete multi-turn conversation contents array for Google GenAI SDK.
 * Formats user turns as { role: 'user', parts: [...] } and assistant turns as { role: 'model', parts: [...] }.
 */
export function buildGeminiMultiTurnContents(
  history: { role: string; content: string }[],
  currentMessage: string,
  currentAttachments?: ChatAttachment[]
): GeminiContentTurn[] {
  const contents: GeminiContentTurn[] = [];

  // 1. Convert past history to alternating Gemini turns
  for (const item of history) {
    if (!item.content || !item.content.trim()) continue;
    const role: 'user' | 'model' =
      item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';

    // If consecutive same role, combine parts to maintain clean turn structure
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push({ text: item.content.trim() });
    } else {
      contents.push({
        role,
        parts: [{ text: item.content.trim() }],
      });
    }
  }

  // Ensure first turn starts with 'user'
  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({
      role: 'user',
      parts: [{ text: 'Halo' }],
    });
  }

  // 2. Current turn parts with multimodal attachments
  const currentParts = buildGeminiContentParts(currentMessage, currentAttachments);

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.push(...currentParts);
  } else {
    contents.push({
      role: 'user',
      parts: currentParts,
    });
  }

  return contents;
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

    const rawBody: unknown = await req.json();
    let body = (rawBody && typeof rawBody === 'object' ? { ...rawBody } : {}) as Record<string, unknown>;

    // Compatibility: extract message from messages array if sent in Vercel AI / chat format
    if (!body?.message && Array.isArray(body?.messages) && body.messages.length > 0) {
      const lastUserMsg = [...body.messages].reverse().find((m: { role?: string; content?: string }) => m.role === 'user');
      if (lastUserMsg && typeof lastUserMsg.content === 'string') {
        body.message = lastUserMsg.content;
      }
    }

    const parsed = SendChatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { sessionId, taskId, canvasId, message: rawMessage, messages, mode, context, attachments } = parsed.data;

    const isCallMode = Boolean(
      context?.isCallMode || req.headers.get('x-call-mode') === 'true'
    );

    // Resolve grade, subject, and language locale context via payload, headers, or automatic classifier
    const headerGrade = (req.headers.get('x-grade-level') as GradeLevel) || undefined;
    const headerSubject = (req.headers.get('x-subject-context') as SubjectCategory) || undefined;
    const headerLocale = (req.headers.get('x-user-locale') as 'id' | 'en' | 'su') || undefined;
    const resolvedLocale = context?.locale || headerLocale || 'id';

    // Acoustic & STT Phonetic Normalization for Voice/Call Queries
    const message = isCallMode
      ? normalizePhoneticQuery(rawMessage, resolvedLocale)
      : rawMessage;

    const classified = classifyStudyContext(
      message,
      `${context?.taskContext?.category || ''} ${context?.canvasContext?.category || ''}`,
      context?.gradeLevel || headerGrade
    );

    let userMemoryProfile: UserMemoryPayload | undefined = undefined;
    if (userId) {
      try {
        const mem = await getUserMemory(userId);
        if (mem) {
          userMemoryProfile = {
            academicStrengths: mem.academicStrengths,
            academicWeaknesses: mem.academicWeaknesses,
            learningStyle: mem.learningStyle,
            academicGoal: mem.academicGoal,
            extractedTopics: mem.extractedTopics,
          };
        }
      } catch (memErr) {
        console.warn('[Chat API]: Could not fetch user memory profile:', memErr);
      }
    }

    const resolvedContext = {
      ...(context || { tutorMode: 'socratic' as const }),
      tutorMode: mode || context?.tutorMode || 'socratic',
      gradeLevel: context?.gradeLevel || headerGrade || classified.gradeLevel,
      subjectContext: context?.subjectContext || headerSubject || classified.subjectCategory,
      locale: context?.locale || headerLocale || 'id',
      isCallMode,
      userMemory: context?.userMemory || userMemoryProfile,
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

    // 3. Resolve Previous Conversation History & Persist New Message
    let chatSessionId = sessionId || `guest-${Date.now()}`;
    let previousHistory: { role: string; content: string }[] = [];

    // Prioritize rich history passed directly from client payload
    if (Array.isArray(messages) && messages.length > 0) {
      previousHistory = messages
        .filter((m) => m && m.content && typeof m.content === 'string' && m.content.trim().length > 0)
        .map((m) => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content.trim(),
        }));

      // If the last message in history array is identical to the current user message, remove it from prior history
      if (
        previousHistory.length > 0 &&
        previousHistory[previousHistory.length - 1].role === 'user' &&
        previousHistory[previousHistory.length - 1].content === message.trim()
      ) {
        previousHistory.pop();
      }
    }

    if (userId) {
      try {
        const chatSession = await getOrCreateChatSession(userId, {
          sessionId,
          taskId,
          canvasId,
          firstMessageTitle: message,
        });
        chatSessionId = chatSession.id;

        // If client did not pass messages array, fetch previous messages from database
        if (previousHistory.length === 0 && sessionId) {
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

    // Dynamic Prompt Complexity Classification & Parameter Optimization (Sub-second latency for Voice Call)
    const baseComplexityConfig = getComplexityConfig(message);
    const complexityConfig = isCallMode
      ? {
          ...baseComplexityConfig,
          tier: 'fast' as const,
          maxOutputTokens: 512,
          thinkingBudget: 0, // 0ms thinking pause for sub-second voice synthesis
          temperature: 0.4,
          statusLabel: 'Synthesizing voice response...',
        }
      : baseComplexityConfig;

    // 4. Redis Semantic & Exact Cache Lookup (for static queries without attachments or BYOK keys)
    const hasAttachments = Boolean(attachments && attachments.length > 0);
    const hasCustomKey = Boolean(customClientKey && customClientKey.trim());
    const eligibleForCache = isCacheEligible(message, hasAttachments, hasCustomKey);

    let cacheKey: string | null = null;
    if (eligibleForCache) {
      cacheKey = await generatePromptCacheKey(message, resolvedContext.tutorMode);
      const cachedResponse = await getCachedResponse(cacheKey);

      if (cachedResponse) {
        console.log(`[AI Cache] HIT for key: ${cacheKey}`);

        // If authenticated user, persist cached assistant message
        if (userId) {
          try {
            await saveChatMessage(chatSessionId, userId, 'assistant', cachedResponse);
          } catch (saveErr) {
            console.error('[Chat API Error]: Failed to persist cached assistant message to DB:', saveErr);
          }
        }

        return new Response(cachedResponse, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Chat-Session-Id': chatSessionId,
            'X-Prompt-Complexity': complexityConfig.tier,
            'X-Cache': 'HIT',
          },
        });
      }
    }

    // Smart History Pruning: retain last 10 messages for rich dialogue context and strip heavy base64
    const prunedHistory = pruneConversationHistory(previousHistory, 10);

    // 5. Build dynamic academic system prompt and multi-turn contents
    const systemInstruction = buildSystemPrompt(resolvedContext);
    const geminiMultiTurnContents = buildGeminiMultiTurnContents(
      prunedHistory,
      message,
      attachments as ChatAttachment[] | undefined
    );

    console.log(`[AI Latency Routing] Classified Prompt Complexity: ${complexityConfig.tier.toUpperCase()} (${complexityConfig.statusLabel})`);

    // 6. Multi-Provider Fallback Cascade Pipeline with Circuit Breakers
    const cascade = getModelCascade();
    let responseStream: AsyncIterable<{ text?: string | null }> | null = null;
    let fallbackStream: ReadableStream<string> | null = null;
    let usedModel: string = cascade[0];
    let usedKeyIndex = 0;
    let lastError: unknown = null;

    // Tier 1: Gemini Multi-Key Pool & Sanitized Model Cascade (Circuit Breaker Guarded)
    const isGeminiAvailable = isProviderAvailable('gemini');
    if (!isGeminiAvailable) {
      console.warn('[Circuit Breaker] Gemini is OPEN (throttled/exhausted). Bypassing Tier 1 directly to OpenRouter...');
    } else {
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
              thinkingConfig: { thinkingBudget: 0 },
              tools: [{ googleSearch: {} }],
            };

            try {
              responseStream = await ai.models.generateContentStream({
                model: candidateModel,
                contents: geminiMultiTurnContents,
                config: geminiConfig,
              });
            } catch (streamInitErr) {
              const strErr = String(streamInitErr);
              if (
                strErr.includes('thinkingConfig') ||
                strErr.includes('thinking_budget') ||
                strErr.includes('Invalid') ||
                strErr.includes('not supported')
              ) {
                // Retry without thinkingConfig for models without thinking parameter support
                delete geminiConfig.thinkingConfig;
                responseStream = await ai.models.generateContentStream({
                  model: candidateModel,
                  contents: geminiMultiTurnContents,
                  config: geminiConfig,
                });
              } else {
                throw streamInitErr;
              }
            }
            usedModel = candidateModel;
            usedKeyIndex = k;
            recordProviderSuccess('gemini');
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
        recordProviderFailure('gemini', lastError);
      }
    }

    // Tier 2: OpenRouter Free Tier Fallback Engine (Circuit Breaker Guarded)
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const isOpenRouterAvailable = isProviderAvailable('openrouter');

    if (!responseStream && !isOpenRouterAvailable) {
      console.warn('[Circuit Breaker] OpenRouter is OPEN (throttled). Bypassing Tier 2 directly to Groq...');
    } else if (!responseStream && openRouterKey && openRouterKey.trim() && !openRouterKey.startsWith('your-')) {
      const orCandidates = ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free'];
      for (const orModel of orCandidates) {
        try {
          console.log(`[AI Multi-Provider Cascade] Activating OpenRouter fallback with ${orModel}`);
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
          recordProviderSuccess('openrouter');
          break;
        } catch (orErr) {
          console.warn(`[AI OpenRouter Model ${orModel} Error]:`, orErr);
          lastError = orErr;
        }
      }

      if (!fallbackStream) {
        recordProviderFailure('openrouter', lastError);
      }
    }

    // Tier 3: Groq High-Speed Fallback Engine (Circuit Breaker Guarded)
    const groqKey = process.env.GROQ_API_KEY;
    const isGroqAvailable = isProviderAvailable('groq');

    if (!responseStream && !fallbackStream && !isGroqAvailable) {
      console.warn('[Circuit Breaker] Groq is OPEN (throttled).');
    } else if (!responseStream && !fallbackStream && groqKey && groqKey.trim() && !groqKey.startsWith('your-')) {
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
        recordProviderSuccess('groq');
      } catch (groqErr) {
        console.error('[AI Groq Fallback Fatal Error]:', groqErr);
        lastError = groqErr;
        recordProviderFailure('groq', groqErr);
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

    // 1. Construct raw text stream from Gemini or Fallback Provider with Empty-Stream Auto-Fallback
    const rawTextStream = new ReadableStream<string>({
      async start(controller) {
        let anyTokensYielded = false;

        // Try reading from Gemini stream if prepared
        if (responseStream) {
          try {
            let geminiTokens = 0;
            for await (const chunk of responseStream) {
              let chunkText = chunk.text || '';
              const rawCandidates = (chunk as unknown as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              }).candidates;

              if (!chunkText && rawCandidates?.[0]?.content?.parts) {
                for (const part of rawCandidates[0].content.parts) {
                  if (part.text) {
                    chunkText += part.text;
                  }
                }
              }
              if (chunkText) {
                geminiTokens++;
                anyTokensYielded = true;
                controller.enqueue(chunkText);
              }
            }

            if (geminiTokens > 0) {
              controller.close();
              return;
            }
            console.warn('[Gemini Empty Response] Gemini yielded 0 tokens. Auto-cascading to OpenRouter/Groq...');
            recordProviderFailure('gemini', new Error('Gemini returned 0 tokens'));
          } catch (geminiError) {
            console.warn('[Gemini Stream Iteration Error]:', geminiError);
            recordProviderFailure('gemini', geminiError);
            if (anyTokensYielded) {
              controller.error(geminiError);
              return;
            }
          }
        }

        // Try reading from Fallback stream if prepared
        if (!anyTokensYielded && fallbackStream) {
          try {
            const reader = fallbackStream.getReader();
            let fbTokens = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                fbTokens++;
                anyTokensYielded = true;
                controller.enqueue(value);
              }
            }

            if (fbTokens > 0) {
              controller.close();
              return;
            }
          } catch (fbError) {
            console.warn('[Fallback Stream Iteration Error]:', fbError);
            if (anyTokensYielded) {
              controller.error(fbError);
              return;
            }
          }
        }

        // Dynamic in-stream OpenRouter fallback if Gemini yielded 0 tokens
        if (!anyTokensYielded && openRouterKey && openRouterKey.trim() && !openRouterKey.startsWith('your-') && isProviderAvailable('openrouter')) {
          const orCandidates = ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free'];
          for (const orModel of orCandidates) {
            try {
              console.log(`[AI In-Stream Fallback] Activating OpenRouter (${orModel})`);
              const orMessages: OpenRouterChatMessage[] = [
                { role: 'system', content: systemInstruction },
                ...prunedHistory.map((m) => ({
                  role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
                  content: m.content,
                })),
                { role: 'user', content: message },
              ];

              const dynStream = await streamOpenRouterCompletion(
                orMessages,
                orModel,
                openRouterKey,
                {
                  temperature: complexityConfig.temperature,
                  maxTokens: complexityConfig.maxOutputTokens,
                }
              );

              const reader = dynStream.getReader();
              let orTokens = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                  orTokens++;
                  anyTokensYielded = true;
                  controller.enqueue(value);
                }
              }

              if (orTokens > 0) {
                recordProviderSuccess('openrouter');
                controller.close();
                return;
              }
            } catch (orErr) {
              console.warn(`[AI In-Stream OpenRouter Error] (${orModel}):`, orErr);
              recordProviderFailure('openrouter', orErr);
            }
          }
        }

        // Dynamic in-stream Groq fallback if OpenRouter yielded 0 tokens
        if (!anyTokensYielded && groqKey && groqKey.trim() && !groqKey.startsWith('your-') && isProviderAvailable('groq')) {
          try {
            console.log(`[AI In-Stream Fallback] Activating Groq (llama-3.3-70b-versatile)`);
            const groqMessages: GroqChatMessage[] = [
              { role: 'system', content: systemInstruction },
              ...prunedHistory.map((m) => ({
                role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
                content: m.content,
              })),
              { role: 'user', content: message },
            ];

            const dynGroqStream = await streamGroqCompletion(
              groqMessages,
              'llama-3.3-70b-versatile',
              groqKey,
              {
                temperature: complexityConfig.temperature,
                maxTokens: complexityConfig.maxOutputTokens,
              }
            );

            const reader = dynGroqStream.getReader();
            let groqTokens = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                groqTokens++;
                anyTokensYielded = true;
                controller.enqueue(value);
              }
            }

            if (groqTokens > 0) {
              recordProviderSuccess('groq');
              controller.close();
              return;
            }
          } catch (groqErr) {
            console.error(`[AI In-Stream Groq Error]:`, groqErr);
            recordProviderFailure('groq', groqErr);
          }
        }

        if (!anyTokensYielded) {
          const isEn = resolvedContext.locale?.startsWith('en');
          const isSu = resolvedContext.locale?.startsWith('su');
          const quotaNotice = isEn
            ? '⚠️ The AI provider is temporarily experiencing high demand (Rate limit / Quota exceeded). Please wait a few seconds, or provide your personal API key in Settings.'
            : isSu
            ? '⚠️ Layanan AI nuju ngalaman antrian padet (Rate limit / Quota exceeded). Mangga antos sakedap atanapi lebetkeun API Key pribadi di Pengaturan.'
            : '⚠️ Layanan AI sedang mengalami antrean padat (Rate limit / Kuota terlampaui). Silakan tunggu beberapa detik, atau masukkan API Key pribadi Anda di menu Pengaturan.';
          controller.enqueue(quotaNotice);
          controller.close();
        } else {
          controller.close();
        }
      },
    });

    // 2. Filter internal thinking tags (<think>...</think>) & script bleeds before transmitting
    const sanitizedTextStream = rawTextStream.pipeThrough(
      createReasoningFilterTransform(resolvedContext.locale)
    );

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const reader = sanitizedTextStream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              fullAssistantResponse += value;
              controller.enqueue(encoder.encode(value));
            }
          }

          // Background write-through to Upstash Redis if eligible
          if (eligibleForCache && cacheKey && fullAssistantResponse.trim()) {
            setCachedResponse(cacheKey, fullAssistantResponse).catch((err) =>
              console.warn('[AI Cache Write-through Error]:', err)
            );
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
          const errorMsg = streamError instanceof Error ? streamError.message : 'Connection interrupted';
          const isRateLimit = errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('resource exhausted');
          const errorNotice = isRateLimit
            ? '\n\n⚠️ *Layanan AI sedang sibuk (Rate limit). Silakan coba lagi beberapa saat lagi.*'
            : `\n\n⚠️ *Streaming error: ${errorMsg}*`;
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
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Chat API Fatal Error]:', error);
    const errString = String(error).toLowerCase();
    const isRateLimit = errString.includes('429') || errString.includes('quota') || errString.includes('resource exhausted');
    return Response.json(
      {
        success: false,
        error: isRateLimit
          ? 'Kapasitas AI sedang padat (Rate limit reached). Silakan tunggu sebentar dan coba lagi.'
          : (error instanceof Error ? error.message : 'Failed to process chat message'),
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
