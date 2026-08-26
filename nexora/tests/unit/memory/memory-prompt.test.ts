import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '@/services/chat-prompt';
import type { ChatContextPayload } from '@/types/chat';

describe('Persistent User Learning Memory Prompt Injection', () => {
  it('injects student strengths, weaknesses, learning style, and goal into system prompt', () => {
    const context: ChatContextPayload = {
      tutorMode: 'socratic',
      gradeLevel: 'SENIOR_HIGH',
      locale: 'id',
      userMemory: {
        academicStrengths: ['Deret Geometri', 'Kinematika Gerak'],
        academicWeaknesses: ['Peluang & Kombinatorika', 'Logika Boolean'],
        learningStyle: 'Analogi visual dan pembuktian langkah demi langkah',
        academicGoal: 'Lolos OSN Informatika & SBMPTN PTN Impian',
      },
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).toContain('### PERSISTENT STUDENT LEARNING MEMORY & ADAPTIVE PROFILE:');
    expect(prompt).toContain('Identified Academic Strengths: Deret Geometri, Kinematika Gerak');
    expect(prompt).toContain('Identified Growth Areas / Weaknesses: Peluang & Kombinatorika, Logika Boolean');
    expect(prompt).toContain('Preferred Learning Style: Analogi visual dan pembuktian langkah demi langkah');
    expect(prompt).toContain('Target Academic Goal: Lolos OSN Informatika & SBMPTN PTN Impian');
    expect(prompt).toContain('*ADAPTIVE TEACHING RULE:*');
  });

  it('handles empty or missing userMemory gracefully without breaking prompt', () => {
    const context: ChatContextPayload = {
      tutorMode: 'step_breakdown',
      gradeLevel: 'JUNIOR_HIGH',
      locale: 'en',
    };

    const prompt = buildSystemPrompt(context);

    expect(prompt).not.toContain('### PERSISTENT STUDENT LEARNING MEMORY & ADAPTIVE PROFILE:');
    expect(prompt).toContain('TARGET AUDIENCE: JUNIOR HIGH SCHOOL');
    expect(prompt).toContain('TARGET RESPONSE LANGUAGE: ENGLISH');
  });
});
