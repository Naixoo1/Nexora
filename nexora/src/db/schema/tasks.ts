import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => tasks.id, {
      onDelete: 'cascade',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('todo'),
    priority: varchar('priority', { length: 10 }).notNull().default('medium'),
    category: varchar('category', { length: 50 }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    source: varchar('source', { length: 20 }).notNull().default('manual'),
    aiSessionId: uuid('ai_session_id'),
    sortOrder: integer('sort_order').notNull().default(0),

    // STEM Canvas compatibility fields
    canvasNodeId: varchar('canvas_node_id', { length: 100 }),
    nodeX: integer('node_x'),
    nodeY: integer('node_y'),
    latexFormula: text('latex_formula'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_tasks_user_id').on(table.userId),
    index('idx_tasks_parent_id').on(table.parentId),
    index('idx_tasks_status').on(table.userId, table.status),
    index('idx_tasks_due_date').on(table.userId, table.dueDate),
    index('idx_tasks_canvas_node').on(table.canvasNodeId),
  ]
);

export const progressSnapshots = pgTable(
  'progress_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    aiSessionId: uuid('ai_session_id'),
    totalSteps: integer('total_steps').notNull().default(0),
    completedSteps: integer('completed_steps').notNull().default(0),
    targets: jsonb('targets').notNull().default('[]'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_progress_task_id').on(table.taskId),
    index('idx_progress_user_id').on(table.userId),
    index('idx_progress_session').on(table.aiSessionId),
  ]
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(user, {
    fields: [tasks.userId],
    references: [user.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: 'task_parent',
  }),
  children: many(tasks, { relationName: 'task_parent' }),
  progressSnapshots: many(progressSnapshots),
}));

export const progressSnapshotsRelations = relations(progressSnapshots, ({ one }) => ({
  task: one(tasks, {
    fields: [progressSnapshots.taskId],
    references: [tasks.id],
  }),
  user: one(user, {
    fields: [progressSnapshots.userId],
    references: [user.id],
  }),
}));

export type TaskSelect = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type ProgressSnapshotSelect = typeof progressSnapshots.$inferSelect;
export type ProgressSnapshotInsert = typeof progressSnapshots.$inferInsert;
