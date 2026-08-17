import { NextRequest } from 'next/server';
import crypto from 'crypto';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tasks } from '@/db/schema/tasks';
import { PlannerGenerateSchema } from '@/lib/validators/task';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { generateStudyPlanWithGemini } from '@/services/ai';
import type { PlannerTaskItem } from '@/types/task';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const userId = session.user.id;

    const body: unknown = await req.json();
    const validatedData = PlannerGenerateSchema.safeParse(body);

    if (!validatedData.success) {
      return validationErrorResponse(
        validatedData.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { prompt, category, dueDate, maxTasks = 10 } = validatedData.data;

    // Call live Gemini AI to produce structured study plan nodes
    const planItems = await generateStudyPlanWithGemini(
      prompt,
      category,
      dueDate,
      maxTasks
    );

    // Generate a unique UUID for this AI planner session
    const aiSessionId = crypto.randomUUID();

    // Use a database transaction to atomically insert the root task and all child sub-tasks
    const taskTree = await db.transaction(async (tx) => {
      const insertTaskTree = async (
        items: PlannerTaskItem[],
        parentId: string | null = null,
        depth: number = 0
      ): Promise<unknown[]> => {
        // Enforce maximum 3-level depth limit
        if (depth >= 3 || !items || items.length === 0) {
          return [];
        }

        const createdTasks = [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          const [createdTask] = await tx
            .insert(tasks)
            .values({
              userId,
              title: item.title,
              description: item.description ?? null,
              priority: item.priority ?? 'medium',
              category: category ?? null,
              status: 'todo',
              parentId,
              source: 'ai_planner',
              aiSessionId,
              dueDate: item.dueDate
                ? new Date(item.dueDate)
                : dueDate
                ? new Date(dueDate)
                : null,
              sortOrder: i,
              canvasNodeId: item.canvasNodeId ?? null,
              nodeX: item.nodeX ?? null,
              nodeY: item.nodeY ?? null,
              latexFormula: item.latexFormula ?? null,
            })
            .returning();

          let children: unknown[] = [];
          if (item.children && item.children.length > 0) {
            children = await insertTaskTree(
              item.children,
              createdTask.id,
              depth + 1
            );
          }

          createdTasks.push({
            ...createdTask,
            children,
            depth,
          });
        }

        return createdTasks;
      };

      return await insertTaskTree(planItems);
    });

    return successResponse(
      taskTree,
      'Study plan generated successfully',
      201
    );
  } catch (error: unknown) {
    console.error('Failed to generate study plan:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
