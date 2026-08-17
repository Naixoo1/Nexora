import { eq, and, desc, asc, like, count } from 'drizzle-orm';

import { db } from '@/lib/db';
import { canvases, canvasNodes, canvasEdges } from '@/db/schema/canvas';
import type {
  CanvasGraph,
  CanvasSummary,
  StemCanvasNode,
  StemCanvasEdge,
  CanvasNodeType,
  CanvasEdgeType,
  NodeValidationStatus,
  CanvasVariable,
} from '@/types/canvas';
import type { CreateCanvas, UpdateCanvas, SaveGraph, CanvasListQuery } from '@/lib/validators/canvas';

/**
 * List canvases belonging to an authenticated user with pagination and filters.
 */
export async function listUserCanvases(
  userId: string,
  query: CanvasListQuery
): Promise<{ items: CanvasSummary[]; total: number; page: number; limit: number; totalPages: number }> {
  const conditions = [eq(canvases.userId, userId)];

  if (query.category) {
    conditions.push(eq(canvases.category, query.category));
  }
  if (query.taskId) {
    conditions.push(eq(canvases.taskId, query.taskId));
  }
  if (query.search) {
    conditions.push(like(canvases.title, `%${query.search}%`));
  }

  const whereClause = and(...conditions);

  const sortColumnMap = {
    created_at: canvases.createdAt,
    updated_at: canvases.updatedAt,
    title: canvases.title,
  } as const;

  const sortColumn = sortColumnMap[query.sortBy];
  const sortDirection = query.sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [totalResult] = await db
    .select({ total: count() })
    .from(canvases)
    .where(whereClause);

  const total = totalResult?.total ?? 0;
  const offset = (query.page - 1) * query.limit;

  const canvasList = await db
    .select()
    .from(canvases)
    .where(whereClause)
    .orderBy(sortDirection)
    .limit(query.limit)
    .offset(offset);

  // Fetch node and edge counts for each canvas
  const items: CanvasSummary[] = await Promise.all(
    canvasList.map(async (c) => {
      const [nodeCountRes] = await db
        .select({ total: count() })
        .from(canvasNodes)
        .where(eq(canvasNodes.canvasId, c.id));

      const [edgeCountRes] = await db
        .select({ total: count() })
        .from(canvasEdges)
        .where(eq(canvasEdges.canvasId, c.id));

      return {
        id: c.id,
        userId: c.userId,
        taskId: c.taskId,
        title: c.title,
        description: c.description,
        category: c.category,
        nodeCount: nodeCountRes?.total ?? 0,
        edgeCount: edgeCountRes?.total ?? 0,
        isPublic: c.isPublic,
        viewport: c.viewport as { x: number; y: number; zoom: number },
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    })
  );

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

/**
 * Get a complete Canvas graph including all nodes and edges.
 */
export async function getCanvasGraph(
  canvasId: string,
  userId: string
): Promise<CanvasGraph | null> {
  const [canvas] = await db
    .select()
    .from(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)));

  if (!canvas) return null;

  const dbNodes = await db
    .select()
    .from(canvasNodes)
    .where(eq(canvasNodes.canvasId, canvasId))
    .orderBy(asc(canvasNodes.sortOrder));

  const dbEdges = await db
    .select()
    .from(canvasEdges)
    .where(eq(canvasEdges.canvasId, canvasId));

  const nodes: StemCanvasNode[] = dbNodes.map((n) => ({
    id: n.id,
    type: n.nodeType as CanvasNodeType,
    position: { x: n.positionX, y: n.positionY },
    width: n.width ?? undefined,
    height: n.height ?? undefined,
    parentId: n.parentNodeId ?? undefined,
    data: {
      title: n.title,
      nodeType: n.nodeType as CanvasNodeType,
      validationStatus: n.validationStatus as NodeValidationStatus,
      isCollapsed: n.isCollapsed,
      content: n.content ?? undefined,
      latexFormula: n.latexFormula ?? undefined,
      variables: (n.variables as CanvasVariable[]) ?? [],
      customData: n.data as Record<string, unknown>,
    },
  }));

  const edges: StemCanvasEdge[] = dbEdges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    type: e.edgeType as CanvasEdgeType,
    label: e.label ?? undefined,
    data: {
      edgeType: e.edgeType as CanvasEdgeType,
      label: e.label ?? undefined,
      ...(e.data as Record<string, unknown>),
    },
  }));

  return {
    id: canvas.id,
    userId: canvas.userId,
    taskId: canvas.taskId,
    title: canvas.title,
    description: canvas.description,
    category: canvas.category,
    viewport: canvas.viewport as { x: number; y: number; zoom: number },
    nodes,
    edges,
    globalVariables: (canvas.globalVars as CanvasVariable[]) ?? [],
    isPublic: canvas.isPublic,
    metadata: canvas.metadata as Record<string, unknown>,
    createdAt: canvas.createdAt,
    updatedAt: canvas.updatedAt,
  };
}

/**
 * Create a new canvas with optional initial problem root node.
 */
export async function createCanvas(
  userId: string,
  payload: CreateCanvas
): Promise<CanvasGraph> {
  return await db.transaction(async (tx) => {
    const [newCanvas] = await tx
      .insert(canvases)
      .values({
        userId,
        taskId: payload.taskId ?? null,
        title: payload.title,
        description: payload.description ?? null,
        category: payload.category ?? null,
        viewport: { x: 0, y: 0, zoom: 1 },
        globalVars: payload.initialProblem?.variables ?? [],
      })
      .returning();

    const nodes: StemCanvasNode[] = [];
    const edges: StemCanvasEdge[] = [];

    if (payload.initialProblem) {
      const rootNodeId = 'root-problem-1';
      const [rootNode] = await tx
        .insert(canvasNodes)
        .values({
          id: rootNodeId,
          canvasId: newCanvas.id,
          nodeType: 'problem_root',
          positionX: 0,
          positionY: 0,
          title: payload.title,
          content: payload.initialProblem.statement,
          latexFormula: payload.initialProblem.latexFormula ?? null,
          validationStatus: 'valid',
          variables: payload.initialProblem.variables ?? [],
          data: {
            statement: payload.initialProblem.statement,
            domain: payload.initialProblem.domain,
            targetGoal: payload.initialProblem.targetGoal ?? '',
            givenVariables: payload.initialProblem.variables ?? [],
          },
        })
        .returning();

      nodes.push({
        id: rootNode.id,
        type: 'problem_root',
        position: { x: rootNode.positionX, y: rootNode.positionY },
        data: {
          title: rootNode.title,
          nodeType: 'problem_root',
          validationStatus: 'valid',
          isCollapsed: false,
          content: rootNode.content ?? undefined,
          latexFormula: rootNode.latexFormula ?? undefined,
          variables: (rootNode.variables as CanvasVariable[]) ?? [],
          customData: rootNode.data as Record<string, unknown>,
        },
      });
    }

    return {
      id: newCanvas.id,
      userId: newCanvas.userId,
      taskId: newCanvas.taskId,
      title: newCanvas.title,
      description: newCanvas.description,
      category: newCanvas.category,
      viewport: newCanvas.viewport as { x: number; y: number; zoom: number },
      nodes,
      edges,
      globalVariables: (newCanvas.globalVars as CanvasVariable[]) ?? [],
      isPublic: newCanvas.isPublic,
      metadata: newCanvas.metadata as Record<string, unknown>,
      createdAt: newCanvas.createdAt,
      updatedAt: newCanvas.updatedAt,
    };
  });
}

/**
 * Update canvas metadata and viewport.
 */
export async function updateCanvas(
  canvasId: string,
  userId: string,
  payload: UpdateCanvas
): Promise<CanvasSummary | null> {
  const updateData: Record<string, unknown> = {
    ...payload,
    updatedAt: new Date(),
  };

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  const [updated] = await db
    .update(canvases)
    .set(updateData)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .returning();

  if (!updated) return null;

  const [nodeCountRes] = await db
    .select({ total: count() })
    .from(canvasNodes)
    .where(eq(canvasNodes.canvasId, canvasId));

  const [edgeCountRes] = await db
    .select({ total: count() })
    .from(canvasEdges)
    .where(eq(canvasEdges.canvasId, canvasId));

  return {
    id: updated.id,
    userId: updated.userId,
    taskId: updated.taskId,
    title: updated.title,
    description: updated.description,
    category: updated.category,
    nodeCount: nodeCountRes?.total ?? 0,
    edgeCount: edgeCountRes?.total ?? 0,
    isPublic: updated.isPublic,
    viewport: updated.viewport as { x: number; y: number; zoom: number },
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Atomic batch save of the entire DAG graph (nodes and edges).
 */
export async function saveCanvasGraph(
  canvasId: string,
  userId: string,
  payload: SaveGraph
): Promise<{ savedNodes: number; savedEdges: number }> {
  return await db.transaction(async (tx) => {
    // 1. Verify canvas ownership
    const [canvas] = await tx
      .select({ id: canvases.id })
      .from(canvases)
      .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)));

    if (!canvas) {
      throw new Error('Canvas not found or unauthorized');
    }

    // 2. Update canvas viewport & global variables
    const canvasUpdates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (payload.viewport) {
      canvasUpdates.viewport = payload.viewport;
    }
    if (payload.globalVariables) {
      canvasUpdates.globalVars = payload.globalVariables;
    }

    await tx
      .update(canvases)
      .set(canvasUpdates)
      .where(eq(canvases.id, canvasId));

    // 3. Clear existing nodes and edges for clean DAG atomic replacement
    await tx.delete(canvasEdges).where(eq(canvasEdges.canvasId, canvasId));
    await tx.delete(canvasNodes).where(eq(canvasNodes.canvasId, canvasId));

    // 4. Batch insert nodes
    if (payload.nodes.length > 0) {
      const nodeValues = payload.nodes.map((node, index) => ({
        id: node.id,
        canvasId,
        nodeType: node.data.nodeType || node.type || 'reasoning_step',
        parentNodeId: node.parentNode ?? null,
        positionX: node.position.x,
        positionY: node.position.y,
        width: node.width ?? null,
        height: node.height ?? null,
        title: node.data.title || 'Untitled Step',
        content: node.data.content ?? null,
        latexFormula: node.data.latexFormula ?? null,
        validationStatus: node.data.validationStatus ?? 'tentative',
        isCollapsed: node.data.isCollapsed ?? false,
        variables: node.data.variables ?? [],
        data: node.data.customData ?? {},
        sortOrder: index,
        updatedAt: new Date(),
      }));

      await tx.insert(canvasNodes).values(nodeValues);
    }

    // 5. Batch insert edges
    if (payload.edges.length > 0) {
      const edgeValues = payload.edges.map((edge) => ({
        id: edge.id,
        canvasId,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        edgeType: edge.data?.edgeType || edge.type || 'implication',
        label: edge.label || edge.data?.label || null,
        data: edge.data ?? {},
        updatedAt: new Date(),
      }));

      await tx.insert(canvasEdges).values(edgeValues);
    }

    return {
      savedNodes: payload.nodes.length,
      savedEdges: payload.edges.length,
    };
  });
}

/**
 * Delete canvas and all attached nodes and edges (via DB cascade).
 */
export async function deleteCanvas(canvasId: string, userId: string): Promise<boolean> {
  const [deleted] = await db
    .delete(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .returning();

  return Boolean(deleted);
}
