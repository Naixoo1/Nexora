import { describe, it, expect, vi } from 'vitest';
import { generateStudyPlanWithGemini } from '@/services/ai';

describe('AI Study Planner Service', () => {
  it('generates a fallback study plan when GEMINI_API_KEY is not set', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const plan = await generateStudyPlanWithGemini(
      'Calculus II: Taylor Series and Integration by Parts',
      'Mathematics',
      '2026-09-01T00:00:00.000Z',
      5
    );

    expect(Array.isArray(plan)).toBe(true);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(5);

    const firstItem = plan[0];
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('priority');
    expect(firstItem.canvasNodeId).toBeDefined();
    expect(typeof firstItem.nodeX).toBe('number');
    expect(typeof firstItem.nodeY).toBe('number');

    if (firstItem.children && firstItem.children.length > 0) {
      const child = firstItem.children[0];
      expect(child.title).toBeDefined();
      expect(child.canvasNodeId).toBeDefined();
      expect(child.nodeX).toBe(280);
    }

    process.env.GEMINI_API_KEY = originalKey;
  });

  it('respects the maxTasks limit', async () => {
    const plan = await generateStudyPlanWithGemini(
      'Physics: Maxwell Equations',
      'Physics',
      undefined,
      1
    );

    expect(plan.length).toBe(1);
  });
});
