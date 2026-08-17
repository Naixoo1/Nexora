import { NextRequest } from 'next/server';
import crypto from 'crypto';

import { db } from '@/lib/db';
import { tasks } from '@/db/schema/tasks';
import { PlannerGenerateSchema } from '@/lib/validators/task';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { PlannerTaskItem } from '@/types/task';

async function generateStudyPlan(
  prompt: string,
  maxTasks: number
): Promise<PlannerTaskItem[]> {
  // TODO: Replace with actual LLM call (Gemini Flash / Claude)
  // This is a placeholder that returns the prompt back as a single task
  return [
    {
      title: `Study Plan: ${prompt.slice(0, 100)}`,
      description: 'AI-generated study plan. Replace this placeholder with actual LLM integration.',
      priority: 'medium' as const,
      children: [],
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    // TODO: Add auth check — get userId from session
    const userId = 'placeholder-user-id';

    const body = await req.json();
    const validatedData = PlannerGenerateSchema.safeParse(body);

    if (!validatedData.success) {
      return validationErrorResponse(validatedData.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { prompt, maxTasks = 10 } = validatedData.data;

    // Call LLM (Placeholder)
    const planItems = await generateStudyPlan(prompt, maxTasks);

    // Generate a UUID for aiSessionId and assign to all tasks in the plan
    const aiSessionId = crypto.randomUUID();

    // Use a database transaction to atomically create the root task and all sub-tasks
    const taskTree = await db.transaction(async (tx) => {
      
      const insertTaskTree = async (
        items: PlannerTaskItem[],
        parentId: string | null = null,
        depth: number = 0
      ): Promise<unknown[]> => {
        // Max 3-level depth respected
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
              description: item.description,
              priority: item.priority,
              status: 'todo',
              parentId,
              source: 'ai_planner',
              aiSessionId,
            })
            .returning();

          let children: unknown[] = [];
          if (item.children && item.children.length > 0) {
            children = await insertTaskTree(item.children, createdTask.id, depth + 1);
          }

          createdTasks.push({
            ...createdTask,
            children
          });
        }

        return createdTasks;
      };

      return await insertTaskTree(planItems);
    });

    return successResponse(taskTree, 'Study plan generated successfully', 201);
  } catch (error: unknown) {
    console.error('Failed to generate study plan:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
