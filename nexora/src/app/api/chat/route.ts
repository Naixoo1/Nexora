import { NextRequest } from 'next/server';
import { GoogleGenAI, type Part } from '@google/genai';

import { auth } from '@/lib/auth';
import { SendChatMessageSchema } from '@/lib/validators/chat';
import { buildSystemPrompt } from '@/services/chat-prompt';
import { getOrCreateChatSession, saveChatMessage } from '@/services/chat';
import { errorResponse, validationErrorResponse } from '@/lib/api-response';
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
        // Gemini 2.5 Flash natively processes images and PDFs via inlineData
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

    const { sessionId, taskId, canvasId, message, context, attachments } = parsed.data;

    // 1. Get or create session & save user message (with attachment metadata)
    const chatSession = await getOrCreateChatSession(userId, {
      sessionId,
      taskId,
      canvasId,
      firstMessageTitle: message,
    });

    await saveChatMessage(
      chatSession.id,
      userId,
      'user',
      message,
      context,
      attachments as ChatAttachment[] | undefined
    );

    // 2. Build dynamic academic system prompt
    const systemInstruction = buildSystemPrompt(context);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key') {
      const attachmentSummary = attachments?.length
        ? `\n\n*${attachments.length} attachment(s) received: ${attachments.map((a) => `${a.name} (${a.type})`).join(', ')}*`
        : '';
      const fallbackResponse = `**[Offline Mode Demo]**\n\nI have received your prompt:\n> *${message}*${attachmentSummary}\n\nUnder mode **${context?.tutorMode || 'socratic'}**, let's analyze the problem step by step. Have you verified the initial boundary conditions?`;
      await saveChatMessage(chatSession.id, userId, 'assistant', fallbackResponse);

      return new Response(fallbackResponse, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Chat-Session-Id': chatSession.id,
        },
      });
    }

    // 3. Build multipart content (text + images + PDFs + text files)
    const contentParts = buildGeminiContentParts(
      message,
      attachments as ChatAttachment[] | undefined
    );

    // 4. Stream from Google GenAI SDK
    const ai = new GoogleGenAI({ apiKey });
    const responseStream = await ai.models.generateContentStream({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: contentParts,
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
