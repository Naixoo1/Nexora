import { GoogleGenAI } from '@google/genai';

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
  ];

  return defaultItems.slice(0, maxTasks);
}

/**
 * Generate a structured hierarchical study plan using Gemini API.
 */
export async function generateStudyPlanWithGemini(
  prompt: string,
  category?: string,
  dueDate?: string,
  maxTasks: number = 10
): Promise<PlannerTaskItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your-gemini-api-key') {
    console.warn('[AI Service] GEMINI_API_KEY not configured. Using structured fallback plan generator.');
    return generateFallbackStudyPlan(prompt, category, dueDate, maxTasks);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are Nexora AI Study Planner, an intelligent academic assistant for high school and university students.
Your goal is to take a study topic, exam preparation goal, or assignment brief and break it down into an actionable, structured, hierarchical study plan.

Rules:
1. Return ONLY a valid JSON array of tasks conforming to the PlannerTaskItem structure.
2. Max hierarchy depth is 2 levels (root tasks with optional children; do NOT nest children further).
3. Max total tasks should not exceed ${maxTasks}.
4. For STEM topics (Math, Physics, Chemistry, CS, Engineering), include relevant LaTeX math formulas in the "latexFormula" field (e.g., "\\int f(x) dx", "E = mc^2", "\\mathcal{O}(n \\log n)").
5. Provide logical spatial canvas coordinates for STEM Canvas rendering:
   - Root items at nodeX: 0, with distinct nodeY values (0, 240, 480, ...).
   - Sub-items at nodeX: 280, with appropriate relative nodeY coordinates.
6. Provide unique "canvasNodeId" (e.g., "node-1", "node-1-1", "node-2").
7. Priority must be one of: "low", "medium", "high", "urgent".

Output schema example:
[
  {
    "title": "Module 1: Fundamental Concepts",
    "description": "Understand core definitions and properties",
    "priority": "high",
    "canvasNodeId": "node-1",
    "nodeX": 0,
    "nodeY": 0,
    "latexFormula": "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
    "children": [
      {
        "title": "Subtask 1.1: Practice Basic Examples",
        "description": "Solve 5 baseline problems",
        "priority": "medium",
        "canvasNodeId": "node-1-1",
        "nodeX": 280,
        "nodeY": -40
      }
    ]
  }
]`;

    const userPrompt = `Study Goal: ${prompt}
Category: ${category || 'Academic'}
Target Due Date: ${dueDate || 'Not specified'}
Maximum Tasks: ${maxTasks}

Create the structured study plan now:`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed: unknown = JSON.parse(responseText);

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid response structure: expected JSON array');
    }

    const validateItem = (item: unknown): PlannerTaskItem => {
      const obj = item as Record<string, unknown>;
      const title = typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : 'Untitled Task';
      const description = typeof obj.description === 'string' ? obj.description : undefined;
      const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
      const priority = validPriorities.includes(obj.priority as TaskPriority)
        ? (obj.priority as TaskPriority)
        : 'medium';
      const itemDueDate = typeof obj.dueDate === 'string' ? obj.dueDate : dueDate;
      const canvasNodeId = typeof obj.canvasNodeId === 'string' ? obj.canvasNodeId : undefined;
      const nodeX = typeof obj.nodeX === 'number' ? obj.nodeX : undefined;
      const nodeY = typeof obj.nodeY === 'number' ? obj.nodeY : undefined;
      const latexFormula = typeof obj.latexFormula === 'string' ? obj.latexFormula : undefined;

      const rawChildren = Array.isArray(obj.children) ? obj.children : [];
      const children = rawChildren.map((child) => {
        const childObj = child as Record<string, unknown>;
        return {
          title: typeof childObj.title === 'string' && childObj.title.trim() ? childObj.title.trim() : 'Subtask',
          description: typeof childObj.description === 'string' ? childObj.description : undefined,
          priority: validPriorities.includes(childObj.priority as TaskPriority)
            ? (childObj.priority as TaskPriority)
            : 'medium',
          dueDate: typeof childObj.dueDate === 'string' ? childObj.dueDate : dueDate,
          canvasNodeId: typeof childObj.canvasNodeId === 'string' ? childObj.canvasNodeId : undefined,
          nodeX: typeof childObj.nodeX === 'number' ? childObj.nodeX : undefined,
          nodeY: typeof childObj.nodeY === 'number' ? childObj.nodeY : undefined,
          latexFormula: typeof childObj.latexFormula === 'string' ? childObj.latexFormula : undefined,
        };
      });

      return {
        title,
        description,
        priority,
        dueDate: itemDueDate,
        canvasNodeId,
        nodeX,
        nodeY,
        latexFormula,
        children: children.length > 0 ? children : undefined,
      };
    };

    const validatedItems = parsed.map(validateItem).slice(0, maxTasks);
    return validatedItems.length > 0 ? validatedItems : generateFallbackStudyPlan(prompt, category, dueDate, maxTasks);
  } catch (error) {
    console.error('[AI Service] Gemini study plan generation error, using fallback:', error);
    return generateFallbackStudyPlan(prompt, category, dueDate, maxTasks);
  }
}
