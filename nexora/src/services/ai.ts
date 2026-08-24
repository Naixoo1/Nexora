import { GoogleGenAI } from '@google/genai';
import {
  getApiKeyPool,
  getModelCascade,
  isKeyExhaustedOrInvalid,
  isTransientError,
  delayWithJitter,
} from '@/services/ai-cascade';
import type { PlannerTaskItem, TaskPriority } from '@/types/task';

/**
 * Fallback plan generator used when GEMINI_API_KEY is not configured or in offline mode.
 */
function generateFallbackStudyPlan(
  prompt: string,
  category?: string,
  dueDate?: string,
  maxTasks: number = 10
): PlannerTaskItem[] {
  const rootTitle = `Study Plan: ${prompt.slice(0, 80)}`;
  const cat = category || 'General';

  const defaultItems: PlannerTaskItem[] = [
    {
      title: `${rootTitle} — Foundations & Review`,
      description: `Review fundamental concepts, lecture notes, and syllabus materials related to ${prompt.slice(0, 50)}.`,
      priority: 'high' as TaskPriority,
      dueDate,
      canvasNodeId: 'node-plan-1',
      nodeX: 0,
      nodeY: 0,
      latexFormula: cat.toLowerCase().includes('math') || cat.toLowerCase().includes('physics')
        ? '\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}'
        : undefined,
      children: [
        {
          title: 'Read core reading materials and identify key terms',
          description: 'Extract core definitions, formulas, and structural outline.',
          priority: 'medium' as TaskPriority,
          canvasNodeId: 'node-plan-1-1',
          nodeX: 280,
          nodeY: -80,
        },
        {
          title: 'Summarize key theorems / formulas',
          description: 'Draft quick-reference notes and memory flashcards.',
          priority: 'medium' as TaskPriority,
          canvasNodeId: 'node-plan-1-2',
          nodeX: 280,
          nodeY: 80,
        },
      ],
    },
    {
      title: `${rootTitle} — Deep Problem Solving & Practice`,
      description: `Solve targeted practice problems, exercise sheets, and previous exam questions on ${prompt.slice(0, 50)}.`,
      priority: 'urgent' as TaskPriority,
      dueDate,
      canvasNodeId: 'node-plan-2',
      nodeX: 0,
      nodeY: 260,
      children: [
        {
          title: 'Attempt intermediate practice questions',
          description: 'Work through step-by-step solutions and verify method accuracy.',
          priority: 'high' as TaskPriority,
          canvasNodeId: 'node-plan-2-1',
          nodeX: 280,
          nodeY: 200,
        },
        {
          title: 'Simulate timed tryout & error review',
          description: 'Assess weak points and revisit challenging solution steps.',
          priority: 'high' as TaskPriority,
          canvasNodeId: 'node-plan-2-2',
          nodeX: 280,
          nodeY: 340,
        },
      ],
    },
    {
      title: `${rootTitle} — Consolidation & Mastery Check`,
      description: `Synthesize findings, verify full understanding, and prepare final deliverables for ${prompt.slice(0, 50)}.`,
      priority: 'medium' as TaskPriority,
      dueDate,
      canvasNodeId: 'node-plan-3',
      nodeX: 0,
      nodeY: 520,
      children: [
        {
          title: 'Review challenging derivation steps',
          description: 'Self-test on foundational assumptions and edge cases.',
          priority: 'medium' as TaskPriority,
          canvasNodeId: 'node-plan-3-1',
          nodeX: 280,
          nodeY: 460,
        },
        {
          title: 'Final summary & project submission',
          description: 'Finalize notes and submit deliverables.',
          priority: 'low' as TaskPriority,
          canvasNodeId: 'node-plan-3-2',
          nodeX: 280,
          nodeY: 580,
        },
      ],
    },
  ];

  return defaultItems.slice(0, maxTasks);
}

import { generateCurriculumStudyPlan } from '@/services/study-planner-service';
import type { GradeLevel } from '@/types/planner';

/**
 * Generate a structured study plan using Gemini AI with Curriculum Taxonomy,
 * Grade Calibration, and Forward Chronological Distribution.
 */
export async function generateStudyPlan(
  prompt: string,
  category?: string,
  dueDate?: string,
  maxTasks: number = 10,
  customApiKey?: string | null,
  gradeLevel?: GradeLevel
): Promise<PlannerTaskItem[]> {
  return generateCurriculumStudyPlan(
    {
      prompt,
      category,
      dueDate,
      gradeLevel,
      maxTasks,
    },
    customApiKey
  );
}

/**
 * Backward-compatible alias for generateStudyPlan
 */
export const generateStudyPlanWithGemini = generateStudyPlan;
