import { eq, and, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { chatSessions, chatMessages } from '@/db/schema/chat';
import type {
  ChatSession,
  ChatMessage,
  ChatSessionWithMessages,
  ChatSourceCitation,
  ChatContextPayload,
  ChatAttachment,
  ChatAttachmentMeta,
} from '@/types/chat';
import type { ChatSessionListQuery } from '@/lib/validators/chat';

/**
 * Extract bracket citations from assistant content: [[node:id|Label]] or [[task:id|Label]]
 */
export function extractCitations(content: string): ChatSourceCitation[] {
  const regex = /\[\[(node|task|formula):([^:|]+)(?:[:|]([^\]]+))?\]\]/g;
  const citations: ChatSourceCitation[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const [, type, refId, label] = match;
    const sourceType = type === 'node' ? 'canvas_node' : type === 'task' ? 'task' : 'formula';
    citations.push({
      id: `cite-${citations.length + 1}`,
      sourceType,
      referenceId: refId.trim(),
      label: (label && label.trim()) || (sourceType === 'canvas_node' ? `Node: ${refId.trim()}` : `Task: ${refId.trim()}`),
    });
  }

  return citations;
}

/**
 * Strip raw base64 data from attachments, keeping only lightweight metadata for DB storage.
 */
export function toAttachmentMeta(attachments?: ChatAttachment[]): ChatAttachmentMeta[] {
  if (!attachments || attachments.length === 0) return [];

  return attachments.map((att) => ({
    id: att.id,
    name: att.name,
    type: att.type,
    mimeType: att.mimeType,
    size: att.size,
  }));
}

export async function getOrCreateChatSession(
  userId: string,
  payload: { sessionId?: string; taskId?: string; canvasId?: string; firstMessageTitle?: string }
): Promise<ChatSession> {
  if (payload.sessionId) {
    const [existing] = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, payload.sessionId), eq(chatSessions.userId, userId)));

    if (existing) return existing as ChatSession;
  }

  const [newSession] = await db
    .insert(chatSessions)
    .values({
      userId,
      taskId: payload.taskId ?? null,
      canvasId: payload.canvasId ?? null,
      title: payload.firstMessageTitle ? payload.firstMessageTitle.slice(0, 50) : 'Brainstorming Session',
      tutorMode: 'socratic',
    })
    .returning();

  return newSession as ChatSession;
}

export async function saveChatMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  contextSnapshot?: ChatContextPayload,
  attachments?: ChatAttachment[]
): Promise<ChatMessage> {
  const citations = role === 'assistant' ? extractCitations(content) : [];
  const attachmentMeta = toAttachmentMeta(attachments);

  const [msg] = await db
    .insert(chatMessages)
    .values({
      sessionId,
      userId,
      role,
      content,
      citations,
      contextSnapshot: contextSnapshot ?? null,
      attachments: attachmentMeta,
    })
    .returning();

  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));

  return msg as ChatMessage;
}

export async function getChatSessionHistory(
  sessionId: string,
  userId: string
): Promise<ChatSessionWithMessages | null> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));

  if (!session) return null;

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);

  return {
    ...(session as ChatSession),
    messages: messages as ChatMessage[],
  };
}

export const getChatSessionWithMessages = getChatSessionHistory;

export async function listUserChatSessions(
  userId: string,
  query: ChatSessionListQuery
): Promise<{ items: ChatSession[]; total: number; page: number; limit: number; totalPages: number }> {
  const conditions = [eq(chatSessions.userId, userId)];

  if (query.taskId) conditions.push(eq(chatSessions.taskId, query.taskId));
  if (query.canvasId) conditions.push(eq(chatSessions.canvasId, query.canvasId));

  const items = await db
    .select()
    .from(chatSessions)
    .where(and(...conditions))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return {
    items: items as ChatSession[],
    total: items.length,
    page: query.page,
    limit: query.limit,
    totalPages: 1,
  };
}

export async function updateChatSession(
  sessionId: string,
  userId: string,
  updates: { title?: string; tutorMode?: string }
): Promise<ChatSession | null> {
  const [updated] = await db
    .update(chatSessions)
    .set({
      ...(updates.title !== undefined ? { title: updates.title.slice(0, 255) } : {}),
      ...(updates.tutorMode !== undefined ? { tutorMode: updates.tutorMode } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .returning();

  return (updated as ChatSession) || null;
}

export async function deleteChatSession(sessionId: string, userId: string): Promise<boolean> {
  const [deleted] = await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .returning();

  return Boolean(deleted);
}
