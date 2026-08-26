import { describe, it, expect } from 'vitest';
import {
  extractLearningMemoryFromTurns,
  DEFAULT_LEARNING_STYLE,
  DEFAULT_ACADEMIC_GOAL,
} from '@/services/memory';

describe('Memory Extraction Service', () => {
  it('extracts default values when message list is empty', async () => {
    const result = await extractLearningMemoryFromTurns([]);
    expect(result.learningStyle).toBe(DEFAULT_LEARNING_STYLE);
    expect(result.academicGoal).toBe(DEFAULT_ACADEMIC_GOAL);
    expect(result.academicStrengths).toEqual([]);
    expect(result.academicWeaknesses).toEqual([]);
  });

  it('preserves existing memory when provided', async () => {
    const existing = {
      id: 'mem-1',
      userId: 'user-1',
      academicStrengths: ['Aljabar Linear'],
      academicWeaknesses: ['Kalkulus Diferensial'],
      learningStyle: 'Contoh terapan industri',
      academicGoal: 'Persiapan Ujian Semester',
      extractedTopics: ['Aljabar Linear'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await extractLearningMemoryFromTurns([], existing);
    expect(result.academicStrengths).toContain('Aljabar Linear');
    expect(result.academicWeaknesses).toContain('Kalkulus Diferensial');
    expect(result.learningStyle).toBe('Contoh terapan industri');
    expect(result.academicGoal).toBe('Persiapan Ujian Semester');
  });

  it('detects topics from dialogue turns via fallback heuristics', async () => {
    const messages = [
      { role: 'user', content: 'Halo Nexora, tolong jelaskan tentang rumus deret geometri dan kinematika gerak.' },
      { role: 'assistant', content: 'Tentu! Deret geometri memiliki rasio konstan r, sedangkan kinematika gerak mempelajari v = v0 + at.' },
      { role: 'user', content: 'Saya masih bingung dan sulit paham di materi peluang dan kombinatorika.' },
    ];

    const result = await extractLearningMemoryFromTurns(messages);
    expect(result.academicStrengths).toContain('Deret Geometri');
    expect(result.academicStrengths).toContain('Kinematika Gerak');
    expect(result.academicWeaknesses).toContain('Peluang & Kombinatorika');
  });
});
