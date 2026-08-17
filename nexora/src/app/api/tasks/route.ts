import { NextRequest } from 'next/server';
import { eq, and, gte, lte, like, sql, desc, asc, isNull, count } from 'drizzle-orm';

import { db } from '@/lib/db';
import { tasks } from '@/db/schema/tasks';
import { CreateTaskSchema, TaskListQuerySchema } from '@/lib/validators/task';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';


// POST /api/tasks
export async function POST(request: NextRequest) {
  try {
    // TODO: Add auth check — get userId from session
    const userId = ''; // placeholder

    const body: unknown = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    // Validate sub-task depth (max 3 levels)
    if (data.parentId) {
      const depth = await getTaskDepth(data.parentId);
      if (depth >= 3) {
        return errorResponse('Maximum sub-task depth of 3 levels exceeded', 400);
      }
    }

    const [newTask] = await db.insert(tasks).values({
      userId,
      parentId: data.parentId ?? null,
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      priority: data.priority,
      category: data.category ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      source: data.source,
      aiSessionId: data.aiSessionId ?? null,
      sortOrder: data.sortOrder,
    }).returning();

    return successResponse(newTask, 'Task created successfully', 201);
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return errorResponse('Failed to create task');
  }
}

// GET /api/tasks
export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check — get userId from session
    const userId = ''; // placeholder

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = TaskListQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const query = parsed.data;
    const conditions = [eq(tasks.userId, userId)];

    // Apply filters
    if (query.status) {
      conditions.push(eq(tasks.status, query.status));
    }
    if (query.priority) {
      conditions.push(eq(tasks.priority, query.priority));
    }
    if (query.source) {
      conditions.push(eq(tasks.source, query.source));
    }
    if (query.parentId === null) {
      conditions.push(isNull(tasks.parentId));
    } else if (query.parentId) {
      conditions.push(eq(tasks.parentId, query.parentId));
    }
    if (query.dueBefore) {
      conditions.push(lte(tasks.dueDate, new Date(query.dueBefore)));
    }
    if (query.dueAfter) {
      conditions.push(gte(tasks.dueDate, new Date(query.dueAfter)));
    }
    if (query.search) {
      conditions.push(like(tasks.title, `%${query.search}%`));
    }

    const whereClause = and(...conditions);

    // Determine sort column and direction
    const sortColumnMap = {
      created_at: tasks.createdAt,
      due_date: tasks.dueDate,
      priority: tasks.priority,
      sort_order: tasks.sortOrder,
      updated_at: tasks.updatedAt,
    } as const;

    const sortColumn = sortColumnMap[query.sortBy];
    const sortDirection = query.sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn);

    // Execute count and data queries
    const [totalResult] = await db
      .select({ total: count() })
      .from(tasks)
      .where(whereClause);

    const total = totalResult?.total ?? 0;
    const offset = (query.page - 1) * query.limit;

    const items = await db
      .select()
      .from(tasks)
      .where(whereClause)
      .orderBy(sortDirection)
      .limit(query.limit)
      .offset(offset);

    return successResponse({
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    }, 'Tasks retrieved successfully');
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return errorResponse('Failed to retrieve tasks');
  }
}

// Helper: Calculate sub-task depth
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
