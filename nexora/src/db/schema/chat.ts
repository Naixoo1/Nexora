import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { user } from './auth';
import { tasks } from './tasks';
import { canvases } from './canvas';

// ── Chat Sessions Table ──────────────────────────────────
export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    canvasId: uuid('canvas_id').references(() => canvases.id, { onDelete: 'set null' }),

    title: varchar('title', { length: 255 }).notNull().default('New Brainstorming Session'),
    tutorMode: varchar('tutor_mode', { length: 30 }).notNull().default('socratic'),
    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_sessions_user').on(table.userId),
    index('idx_chat_sessions_task').on(table.taskId),
    index('idx_chat_sessions_canvas').on(table.canvasId),
    index('idx_chat_sessions_updated').on(table.userId, table.updatedAt),
  ]
);

// ── Chat Messages Table ──────────────────────────────────
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    citations: jsonb('citations').notNull().default([]),
    contextSnapshot: jsonb('context_snapshot'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_chat_messages_session').on(table.sessionId, table.createdAt),
    index('idx_chat_messages_user').on(table.userId),
  ]
);

// ── Relations ────────────────────────────────────────────
export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(user, {
    fields: [chatSessions.userId],
    references: [user.id],
  }),
  task: one(tasks, {
    fields: [chatSessions.taskId],
    references: [tasks.id],
  }),
  canvas: one(canvases, {
    fields: [chatSessions.canvasId],
    references: [canvases.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  user: one(user, {
    fields: [chatMessages.userId],
    references: [user.id],
  }),
}));

export type ChatSessionSelect = typeof chatSessions.$inferSelect;
export type ChatSessionInsert = typeof chatSessions.$inferInsert;
export type ChatMessageSelect = typeof chatMessages.$inferSelect;
export type ChatMessageInsert = typeof chatMessages.$inferInsert;
