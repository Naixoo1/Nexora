import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { user } from './auth';
import { tasks } from './tasks';

// ── Canvases Table ─────────────────────────────────────────
export const canvases = pgTable(
  'canvases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),

    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }),

    viewport: jsonb('viewport').notNull().default({ x: 0, y: 0, zoom: 1 }),
    globalVars: jsonb('global_vars').notNull().default([]),
    isPublic: boolean('is_public').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_canvases_user_id').on(table.userId),
    index('idx_canvases_task_id').on(table.taskId),
    index('idx_canvases_category').on(table.userId, table.category),
  ]
);

// ── Canvas Nodes Table ─────────────────────────────────────
export const canvasNodes = pgTable(
  'canvas_nodes',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    canvasId: uuid('canvas_id')
      .notNull()
      .references(() => canvases.id, { onDelete: 'cascade' }),
    nodeType: varchar('node_type', { length: 30 }).notNull(),
    parentNodeId: varchar('parent_node_id', { length: 100 }),

    positionX: real('position_x').notNull().default(0),
    positionY: real('position_y').notNull().default(0),
    width: real('width'),
    height: real('height'),

    title: varchar('title', { length: 255 }).notNull(),
    content: text('content'),
    latexFormula: text('latex_formula'),

    validationStatus: varchar('validation_status', { length: 20 })
      .notNull()
      .default('tentative'),
    isCollapsed: boolean('is_collapsed').notNull().default(false),

    variables: jsonb('variables').notNull().default([]),
    data: jsonb('data').notNull().default({}),
    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_canvas_nodes_canvas_id').on(table.canvasId),
    index('idx_canvas_nodes_parent').on(table.canvasId, table.parentNodeId),
    index('idx_canvas_nodes_type').on(table.canvasId, table.nodeType),
  ]
);

// ── Canvas Edges Table ─────────────────────────────────────
export const canvasEdges = pgTable(
  'canvas_edges',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    canvasId: uuid('canvas_id')
      .notNull()
      .references(() => canvases.id, { onDelete: 'cascade' }),
    sourceNodeId: varchar('source_node_id', { length: 100 }).notNull(),
    targetNodeId: varchar('target_node_id', { length: 100 }).notNull(),
    edgeType: varchar('edge_type', { length: 30 }).notNull().default('implication'),
    label: varchar('label', { length: 100 }),
    data: jsonb('data').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_canvas_edges_canvas_id').on(table.canvasId),
    index('idx_canvas_edges_source').on(table.canvasId, table.sourceNodeId),
    index('idx_canvas_edges_target').on(table.canvasId, table.targetNodeId),
  ]
);

// ── Relations ──────────────────────────────────────────────
export const canvasesRelations = relations(canvases, ({ one, many }) => ({
  user: one(user, {
    fields: [canvases.userId],
    references: [user.id],
  }),
  task: one(tasks, {
    fields: [canvases.taskId],
    references: [tasks.id],
  }),
  nodes: many(canvasNodes),
  edges: many(canvasEdges),
}));

export const canvasNodesRelations = relations(canvasNodes, ({ one }) => ({
  canvas: one(canvases, {
    fields: [canvasNodes.canvasId],
    references: [canvases.id],
  }),
}));

export const canvasEdgesRelations = relations(canvasEdges, ({ one }) => ({
  canvas: one(canvases, {
    fields: [canvasEdges.canvasId],
    references: [canvases.id],
  }),
}));

export type CanvasSelect = typeof canvases.$inferSelect;
export type CanvasInsert = typeof canvases.$inferInsert;
export type CanvasNodeSelect = typeof canvasNodes.$inferSelect;
export type CanvasNodeInsert = typeof canvasNodes.$inferInsert;
export type CanvasEdgeSelect = typeof canvasEdges.$inferSelect;
export type CanvasEdgeInsert = typeof canvasEdges.$inferInsert;
