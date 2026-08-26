import { eq } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { db } from '@/lib/db';
import { userMemory } from '@/db/schema/memory';
import { getApiKeyPool, getModelCascade } from './ai-cascade';
import type { UserMemory, UserMemoryPayload } from '@/types/memory';

export const DEFAULT_LEARNING_STYLE = 'Visual analogies, step-by-step Socratic guidance';
export const DEFAULT_ACADEMIC_GOAL = 'Persiapan Ujian & Penguasaan Konsep Mandiri';

/**
 * Fetch a student's persistent learning memory profile.
 */
export async function getUserMemory(userId: string): Promise<UserMemory | null> {
  if (!userId) return null;

  const [record] = await db
    .select()
    .from(userMemory)
    .where(eq(userMemory.userId, userId));

  if (!record) return null;

  return {
    id: record.id,
    userId: record.userId,
    academicStrengths: Array.isArray(record.academicStrengths)
      ? (record.academicStrengths as string[])
      : [],
    academicWeaknesses: Array.isArray(record.academicWeaknesses)
      ? (record.academicWeaknesses as string[])
      : [],
    learningStyle: record.learningStyle || DEFAULT_LEARNING_STYLE,
    academicGoal: record.academicGoal || DEFAULT_ACADEMIC_GOAL,
    extractedTopics: Array.isArray(record.extractedTopics)
      ? (record.extractedTopics as string[])
      : [],
    rawNotes: record.rawNotes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Upsert or manually update a student's persistent learning memory profile.
 */
export async function upsertUserMemory(
  userId: string,
  payload: Partial<UserMemoryPayload>
): Promise<UserMemory> {
  const existing = await db
    .select()
    .from(userMemory)
    .where(eq(userMemory.userId, userId));

  const strengths = payload.academicStrengths !== undefined
    ? payload.academicStrengths
    : existing[0]?.academicStrengths || [];
  const weaknesses = payload.academicWeaknesses !== undefined
    ? payload.academicWeaknesses
    : existing[0]?.academicWeaknesses || [];
  const learningStyle = payload.learningStyle !== undefined
    ? payload.learningStyle
    : existing[0]?.learningStyle || DEFAULT_LEARNING_STYLE;
  const academicGoal = payload.academicGoal !== undefined
    ? payload.academicGoal
    : existing[0]?.academicGoal || DEFAULT_ACADEMIC_GOAL;
  const extractedTopics = payload.extractedTopics !== undefined
    ? payload.extractedTopics
    : existing[0]?.extractedTopics || [];
  const rawNotes = payload.rawNotes !== undefined
    ? payload.rawNotes
    : existing[0]?.rawNotes || null;

  if (existing.length > 0) {
    const [updated] = await db
      .update(userMemory)
      .set({
        academicStrengths: strengths,
        academicWeaknesses: weaknesses,
        learningStyle,
        academicGoal,
        extractedTopics,
        rawNotes,
        updatedAt: new Date(),
      })
      .where(eq(userMemory.userId, userId))
      .returning();

    return {
      id: updated.id,
      userId: updated.userId,
      academicStrengths: Array.isArray(updated.academicStrengths)
        ? (updated.academicStrengths as string[])
        : [],
      academicWeaknesses: Array.isArray(updated.academicWeaknesses)
        ? (updated.academicWeaknesses as string[])
        : [],
      learningStyle: updated.learningStyle,
      academicGoal: updated.academicGoal,
      extractedTopics: Array.isArray(updated.extractedTopics)
        ? (updated.extractedTopics as string[])
        : [],
      rawNotes: updated.rawNotes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  const [created] = await db
    .insert(userMemory)
    .values({
      userId,
      academicStrengths: strengths,
      academicWeaknesses: weaknesses,
      learningStyle,
      academicGoal,
      extractedTopics,
      rawNotes,
    })
    .returning();

  return {
    id: created.id,
    userId: created.userId,
    academicStrengths: Array.isArray(created.academicStrengths)
      ? (created.academicStrengths as string[])
      : [],
    academicWeaknesses: Array.isArray(created.academicWeaknesses)
      ? (created.academicWeaknesses as string[])
      : [],
    learningStyle: created.learningStyle,
    academicGoal: created.academicGoal,
    extractedTopics: Array.isArray(created.extractedTopics)
      ? (created.extractedTopics as string[])
      : [],
    rawNotes: created.rawNotes,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

/**
 * Reset a student's learning memory profile to default values.
 */
export async function resetUserMemory(userId: string): Promise<UserMemory> {
  return upsertUserMemory(userId, {
    academicStrengths: [],
    academicWeaknesses: [],
    learningStyle: DEFAULT_LEARNING_STYLE,
    academicGoal: DEFAULT_ACADEMIC_GOAL,
    extractedTopics: [],
    rawNotes: null,
  });
}

/**
 * Fast LLM extraction pass to identify updated strengths, weaknesses, learning style, and topics from conversation turns.
 */
export async function extractLearningMemoryFromTurns(
  messages: Array<{ role: string; content: string }>,
  currentMemory?: UserMemory | null
): Promise<UserMemoryPayload> {
  if (!messages || messages.length === 0) {
    return {
      academicStrengths: currentMemory?.academicStrengths || [],
      academicWeaknesses: currentMemory?.academicWeaknesses || [],
      learningStyle: currentMemory?.learningStyle || DEFAULT_LEARNING_STYLE,
      academicGoal: currentMemory?.academicGoal || DEFAULT_ACADEMIC_GOAL,
    };
  }

  const turnsText = messages
    .slice(-10)
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 400)}`)
    .join('\n\n');

  const extractionPrompt = `You are Nexora's Cognitive & Pedagogical Profiler.
Analyze the following student-tutor dialogue. Identify:
1. Academic strengths (topics/concepts the student understands well or solves accurately).
2. Academic growth areas / weaknesses (topics where the student struggles, asks for basic explanations, or makes errors).
3. Preferred learning style hints (e.g. Visual analogies, algebraic rigor, Socratic questioning, concise summaries).
4. Academic goal hints (if mentioned, e.g. Exam Prep, Olympiad, Thesis).

Current Student Profile:
- Existing Strengths: ${JSON.stringify(currentMemory?.academicStrengths || [])}
- Existing Weaknesses: ${JSON.stringify(currentMemory?.academicWeaknesses || [])}
- Current Learning Style: "${currentMemory?.learningStyle || DEFAULT_LEARNING_STYLE}"
- Current Goal: "${currentMemory?.academicGoal || DEFAULT_ACADEMIC_GOAL}"

Recent Dialogue Turns:
${turnsText}

Respond ONLY with a valid JSON object matching this exact structure:
{
  "academicStrengths": ["topic1", "topic2"],
  "academicWeaknesses": ["topic1", "topic2"],
  "learningStyle": "string description",
  "academicGoal": "string goal",
  "extractedTopics": ["topic1", "topic2"]
}`;

  try {
    const keyPool = getApiKeyPool();
    if (keyPool.length > 0) {
      const ai = new GoogleGenAI({ apiKey: keyPool[0] });
      const model = getModelCascade()[0] || 'gemini-2.5-flash';

      const response = await ai.models.generateContent({
        model,
        contents: [{ text: extractionPrompt }],
        config: {
          temperature: 0.2,
          maxOutputTokens: 600,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const mergedStrengths = Array.from(
          new Set([...(currentMemory?.academicStrengths || []), ...(parsed.academicStrengths || [])])
        ).slice(0, 10);
        const mergedWeaknesses = Array.from(
          new Set([...(currentMemory?.academicWeaknesses || []), ...(parsed.academicWeaknesses || [])])
        ).slice(0, 10);
        const mergedTopics = Array.from(
          new Set([...(currentMemory?.extractedTopics || []), ...(parsed.extractedTopics || [])])
        ).slice(0, 15);

        return {
          academicStrengths: mergedStrengths,
          academicWeaknesses: mergedWeaknesses,
          learningStyle: parsed.learningStyle || currentMemory?.learningStyle || DEFAULT_LEARNING_STYLE,
          academicGoal: parsed.academicGoal || currentMemory?.academicGoal || DEFAULT_ACADEMIC_GOAL,
          extractedTopics: mergedTopics,
        };
      }
    }
  } catch (err) {
    console.warn('[Memory Service]: LLM extraction pass failed, using fallback heuristic:', err);
  }

  // Fallback heuristic extraction
  const lowerAll = turnsText.toLowerCase();
  const fallbackStrengths = [...(currentMemory?.academicStrengths || [])];
  const fallbackWeaknesses = [...(currentMemory?.academicWeaknesses || [])];

  if (lowerAll.includes('deret geometri') && !fallbackStrengths.includes('Deret Geometri')) {
    fallbackStrengths.push('Deret Geometri');
  }
  if (lowerAll.includes('kinematika') && !fallbackStrengths.includes('Kinematika Gerak')) {
    fallbackStrengths.push('Kinematika Gerak');
  }
  if ((lowerAll.includes('bingung') || lowerAll.includes('sulit') || lowerAll.includes('tidak paham')) && lowerAll.includes('peluang') && !fallbackWeaknesses.includes('Peluang & Kombinatorika')) {
    fallbackWeaknesses.push('Peluang & Kombinatorika');
  }

  return {
    academicStrengths: fallbackStrengths,
    academicWeaknesses: fallbackWeaknesses,
    learningStyle: currentMemory?.learningStyle || DEFAULT_LEARNING_STYLE,
    academicGoal: currentMemory?.academicGoal || DEFAULT_ACADEMIC_GOAL,
    extractedTopics: currentMemory?.extractedTopics || [],
  };
}
