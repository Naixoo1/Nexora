import { eq, and, inArray, count, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { canvases, canvasNodes } from '@/db/schema/canvas';
import { tasks, type TaskSelect } from '@/db/schema/tasks';
import type { CanvasVariable } from '@/types/canvas';
import type { NodeToTaskConvert, CanvasTasksQuery } from '@/lib/validators/canvas-task';

/**
 * Helper: Calculate sub-task depth for hierarchical nesting validation (max 3 levels).
 */
async function getTaskDepth(taskId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = taskId;

  while (currentId) {
    const [parent] = await db
      .select({ parentId: tasks.parentId })
      .from(tasks)
      .where(eq(tasks.id, currentId));

    if (!parent) break;
    depth++;
    currentId = parent.parentId;
  }

  return depth;
}

/**
 * Helper: Format human-friendly label from node type.
 */
function formatNodeTypeLabel(nodeType: string): string {
  switch (nodeType) {
    case 'problem_root':
      return 'Problem';
    case 'reasoning_step':
      return 'Derivation Step';
    case 'what_if_branch':
      return 'What-If Simulation';
    case 'theorem_proof':
      return 'Theorem / Proof';
    case 'formula_block':
      return 'Formula';
    default:
      return 'Canvas Step';
  }
}

/**
 * Convert a canvas node into a tracked Task with automated LaTeX and parameter enrichment.
 */
export async function convertNodeToTask(
  canvasId: string,
  nodeId: string,
  userId: string,
  payload: NodeToTaskConvert
): Promise<TaskSelect> {
  // 1. Verify canvas ownership
  const [canvas] = await db
    .select()
    .from(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)));

  if (!canvas) {
    throw new Error('Canvas not found or unauthorized');
  }

  // 2. Verify node exists in canvas
  const [node] = await db
    .select()
    .from(canvasNodes)
    .where(and(eq(canvasNodes.id, nodeId), eq(canvasNodes.canvasId, canvasId)));

  if (!node) {
    throw new Error('Canvas node not found');
  }

  // 3. Verify parent task depth if specified
  if (payload.parentTaskId) {
    const [parentTask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, payload.parentTaskId), eq(tasks.userId, userId)));

    if (!parentTask) {
      throw new Error('Parent task not found or unauthorized');
    }

    const currentDepth = await getTaskDepth(payload.parentTaskId);
    if (currentDepth >= 3) {
      throw new Error('Maximum sub-task depth of 3 levels exceeded');
    }
  }

  // 4. Generate intelligent title if not overridden
  const title =
    payload.title?.trim() ||
    `[${formatNodeTypeLabel(node.nodeType)}] ${node.title}`;

  // 5. Generate intelligent description if not overridden
  let description = payload.description?.trim();

  if (!description) {
    const sections: string[] = [];

    if (node.content) {
      sections.push(node.content.trim());
    }

    if (payload.includeLatexInDescription && node.latexFormula) {
      sections.push(`### Mathematical Formulation\n$$\n${node.latexFormula}\n$$`);
    }

    const nodeVariables = (node.variables as CanvasVariable[]) || [];
    if (payload.includeVariablesInDescription && nodeVariables.length > 0) {
      const varLines = nodeVariables.map(
        (v) =>
          `- **$${v.symbol}$** (${v.label || v.name}): ${v.value} ${v.unit || ''} (Range: [${v.min}, ${v.max}], Step: ${v.step})`
      );
      sections.push(`### Active Parameters\n${varLines.join('\n')}`);
    }

    sections.push(
      `*Exported from STEM Canvas: **"${canvas.title}"** (Node: \`${node.id}\`)*`
    );

    description = sections.join('\n\n');
  }

  const category = payload.category ?? canvas.category ?? null;
  const dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  const priority =
    payload.priority || (node.validationStatus === 'erroneous' ? 'high' : 'medium');

  // 6. Insert new task
  const [createdTask] = await db
    .insert(tasks)
    .values({
      userId,
      parentId: payload.parentTaskId ?? null,
      title,
      description,
      status: 'todo',
      priority,
      category,
      dueDate,
      source: 'canvas_export',
      canvasNodeId: node.id,
      nodeX: Math.round(node.positionX),
      nodeY: Math.round(node.positionY),
      latexFormula: node.latexFormula ?? null,
      sortOrder: 0,
    })
    .returning();

  return createdTask;
}

/**
 * List all tasks linked to nodes within a specific canvas.
 */
export async function listCanvasLinkedTasks(
  canvasId: string,
  userId: string,
  query: CanvasTasksQuery
): Promise<{
  items: (TaskSelect & { canvasNodeTitle?: string })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // 1. Verify canvas ownership
  const [canvas] = await db
    .select({ id: canvases.id })
    .from(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)));

  if (!canvas) {
    throw new Error('Canvas not found or unauthorized');
  }

  // 2. Fetch all node IDs and titles for this canvas
  const nodes = await db
    .select({ id: canvasNodes.id, title: canvasNodes.title })
    .from(canvasNodes)
    .where(eq(canvasNodes.canvasId, canvasId));

  if (nodes.length === 0) {
    return {
      items: [],
      total: 0,
      page: query.page,
      limit: query.limit,
      totalPages: 0,
    };
  }

  const nodeMap = new Map<string, string>();
  const nodeIds: string[] = [];
  for (const n of nodes) {
    nodeMap.set(n.id, n.title);
    nodeIds.push(n.id);
  }

  // 3. Query tasks linked to these node IDs
  const conditions = [
    eq(tasks.userId, userId),
    inArray(tasks.canvasNodeId, nodeIds),
  ];

  if (query.status) {
    conditions.push(eq(tasks.status, query.status));
  }
  if (query.priority) {
    conditions.push(eq(tasks.priority, query.priority));
  }

  const whereClause = and(...conditions);

  const [totalResult] = await db
    .select({ total: count() })
    .from(tasks)
    .where(whereClause);

  const total = totalResult?.total ?? 0;
  const offset = (query.page - 1) * query.limit;

  const dbTasks = await db
    .select()
    .from(tasks)
    .where(whereClause)
    .orderBy(desc(tasks.createdAt))
    .limit(query.limit)
    .offset(offset);

  const items = dbTasks.map((t) => ({
    ...t,
    canvasNodeTitle: t.canvasNodeId ? nodeMap.get(t.canvasNodeId) : undefined,
  }));

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}
