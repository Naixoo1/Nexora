import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

export const userMemory = pgTable(
  'user_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    academicStrengths: jsonb('academic_strengths').notNull().default([]),
    academicWeaknesses: jsonb('academic_weaknesses').notNull().default([]),
    learningStyle: text('learning_style')
      .notNull()
      .default('Visual analogies, step-by-step Socratic guidance'),
    academicGoal: text('academic_goal')
      .notNull()
      .default('Persiapan Ujian & Penguasaan Konsep Mandiri'),
    extractedTopics: jsonb('extracted_topics').notNull().default([]),
    rawNotes: text('raw_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_user_memory_user_id').on(table.userId),
  ]
);

export const userMemoryRelations = relations(userMemory, ({ one }) => ({
  user: one(user, {
    fields: [userMemory.userId],
    references: [user.id],
  }),
}));

export type UserMemorySelect = typeof userMemory.$inferSelect;
export type UserMemoryInsert = typeof userMemory.$inferInsert;
