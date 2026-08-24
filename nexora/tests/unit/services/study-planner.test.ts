import { describe, it, expect } from 'vitest';
import {
  classifyStudyContext,
  detectGradeLevel,
} from '@/services/study-planner-classifier';
import {
  distributeForwardChronologicalDeadlines,
  generateCurriculumFallbackStudyPlan,
  generateCurriculumStudyPlan,
} from '@/services/study-planner-service';
import { formatRelativeDeadline } from '@/types/planner';
import type { PlannerTaskItem } from '@/types/task';

describe('Study Planner Curriculum Classifier', () => {
  it('classifies Language & Literature topics correctly with forbidMathFormulas: true', () => {
    // 1. Sundanese drama
    const sunda = classifyStudyContext(
      'Latihan naskah drama basa sunda paguneman tema kapahlawanan',
      'Bahasa & Seni'
    );
    expect(sunda.subjectCategory).toBe('LANGUAGE_LITERATURE');
    expect(sunda.forbidMathFormulas).toBe(true);
    expect(sunda.subject).toBe('Bahasa Sunda');
    expect(sunda.detectedKeywords).toContain('drama basa sunda');
    expect(sunda.detectedKeywords).toContain('paguneman');

    // 2. English Parliamentary Debate
    const english = classifyStudyContext(
      'Preparation for English Parliamentary Debate on AI Ethics',
      'Language Arts'
    );
    expect(english.subjectCategory).toBe('LANGUAGE_LITERATURE');
    expect(english.forbidMathFormulas).toBe(true);
    expect(english.subject).toContain('English');

    // 3. Indonesian Literature / Speech
    const indonesian = classifyStudyContext(
      'Penyusunan naskah pidato dan teks eksposisi Bahasa Indonesia',
      'Tugas Sekolah'
    );
    expect(indonesian.subjectCategory).toBe('LANGUAGE_LITERATURE');
    expect(indonesian.forbidMathFormulas).toBe(true);
    expect(indonesian.subject).toBe('Bahasa Indonesia');
  });

  it('classifies Social & Humanities topics correctly with forbidMathFormulas: true', () => {
    // 1. History Linimasa
    const history = classifyStudyContext(
      'Linimasa kronologis peristiwa Rengasdengklok dan Proklamasi 1945',
      'Sejarah'
    );
    expect(history.subjectCategory).toBe('SOCIAL_HUMANITIES');
    expect(history.forbidMathFormulas).toBe(true);
    expect(history.subject).toContain('Sejarah');

    // 2. Pancasila & Civics
    const civics = classifyStudyContext(
      'Analisis pasal-pasal UUD 1945 dan penerapan norma konstitusi Pancasila',
      'PPKn'
    );
    expect(civics.subjectCategory).toBe('SOCIAL_HUMANITIES');
    expect(civics.forbidMathFormulas).toBe(true);
    expect(civics.subject).toContain('Pancasila');

    // 3. Geography
    const geo = classifyStudyContext(
      'Interpretasi data SIG dan analisis fenomena litosfer serta tata ruang wilayah',
      'Geografi'
    );
    expect(geo.subjectCategory).toBe('SOCIAL_HUMANITIES');
    expect(geo.forbidMathFormulas).toBe(true);
    expect(geo.subject).toBe('Geografi');
  });

  it('classifies STEM & Analytical topics correctly with forbidMathFormulas: false', () => {
    // 1. Mathematics Calculus
    const math = classifyStudyContext(
      'Latihan soal kalkulus turunan dan integral fungsi trigonometri',
      'Matematika'
    );
    expect(math.subjectCategory).toBe('STEM_ANALYTICAL');
    expect(math.forbidMathFormulas).toBe(false);
    expect(math.subject).toContain('Matematika');

    // 2. Physics Modern
    const physics = classifyStudyContext(
      'Persiapan UTBK Fisika modern: efek fotolistrik dan teori relativitas khusus',
      'Fisika'
    );
    expect(physics.subjectCategory).toBe('STEM_ANALYTICAL');
    expect(physics.forbidMathFormulas).toBe(false);
    expect(physics.subject).toBe('Fisika');

    // 3. Computer Science / Informatics
    const cs = classifyStudyContext(
      'Penguasaan algoritma Dynamic Programming dan Graph Traversal BFS/DFS',
      'Informatika'
    );
    expect(cs.subjectCategory).toBe('STEM_ANALYTICAL');
    expect(cs.forbidMathFormulas).toBe(false);
    expect(cs.subject).toContain('Informatika');
  });

  it('detects Grade Levels correctly from keywords and respects user override', () => {
    expect(detectGradeLevel('Tugas IPA SD Kelas 5 tentang organ pernapasan')).toBe('PRIMARY');
    expect(detectGradeLevel('Matematika SMP Kelas 8 Teorema Pythagoras')).toBe('JUNIOR_HIGH');
    expect(detectGradeLevel('Persiapan UTBK SNBT Matematika SMA')).toBe('SENIOR_HIGH');
    expect(detectGradeLevel('Algoritma Pemrograman')).toBe('SENIOR_HIGH');

    // User explicit override takes precedence
    expect(detectGradeLevel('Tugas IPA SD Kelas 5', 'SENIOR_HIGH')).toBe('SENIOR_HIGH');
    expect(detectGradeLevel('Persiapan UTBK SMA', 'PRIMARY')).toBe('PRIMARY');
  });
});

describe('Relative Deadline Formatter', () => {
  const BASE_TIME = new Date('2026-08-25T10:00:00.000Z').getTime();

  it('handles empty or invalid date strings gracefully', () => {
    expect(formatRelativeDeadline(null, BASE_TIME)).toBe('');
    expect(formatRelativeDeadline(undefined, BASE_TIME)).toBe('');
    expect(formatRelativeDeadline('invalid-date', BASE_TIME)).toBe('');
  });

  it('formats overdue deadlines accurately', () => {
    // 15 mins ago
    const m15Ago = new Date(BASE_TIME - 15 * 60 * 1000).toISOString();
    expect(formatRelativeDeadline(m15Ago, BASE_TIME)).toBe('Overdue by 15m');

    // 2 hours 30 mins ago
    const h2Ago = new Date(BASE_TIME - (2 * 60 + 30) * 60 * 1000).toISOString();
    expect(formatRelativeDeadline(h2Ago, BASE_TIME)).toBe('Overdue by 2h 30m');

    // 3 days ago
    const d3Ago = new Date(BASE_TIME - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDeadline(d3Ago, BASE_TIME)).toBe('Overdue by 3d');
  });

  it('formats future deadlines accurately', () => {
    // 45 mins in future
    const in45m = new Date(BASE_TIME + 45 * 60 * 1000).toISOString();
    expect(formatRelativeDeadline(in45m, BASE_TIME)).toBe('Due in 45m');

    // 3 hours in future (same day)
    const in3h = new Date(BASE_TIME + 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDeadline(in3h, BASE_TIME)).toContain('Due in 3h');

    // Tomorrow
    const tomorrow = new Date(BASE_TIME + 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDeadline(tomorrow, BASE_TIME)).toContain('Due tomorrow at');

    // 4 days in future
    const in4d = new Date(BASE_TIME + 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDeadline(in4d, BASE_TIME)).toContain('Due in 4d');

    // 14 days in future
    const in14d = new Date(BASE_TIME + 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDeadline(in14d, BASE_TIME)).toContain('Due on');
  });
});

describe('Forward Chronological Timeline Distribution', () => {
  it('distributes milestones and subtasks monotonically forward in time', () => {
    const startMs = new Date('2026-08-25T10:00:00.000Z').getTime();
    const endMs = new Date('2026-09-01T10:00:00.000Z').getTime(); // 7 days later

    const dummyItems: PlannerTaskItem[] = [
      {
        title: 'Milestone 1',
        children: [
          { title: 'Subtask 1.1' },
          { title: 'Subtask 1.2' },
        ],
      },
      {
        title: 'Milestone 2',
        children: [
          { title: 'Subtask 2.1' },
        ],
      },
      {
        title: 'Milestone 3',
      },
    ];

    const distributed = distributeForwardChronologicalDeadlines(dummyItems, startMs, endMs);

    expect(distributed.length).toBe(3);

    // Milestones must be strictly increasing in due date
    const d1 = new Date(distributed[0].dueDate!).getTime();
    const d2 = new Date(distributed[1].dueDate!).getTime();
    const d3 = new Date(distributed[2].dueDate!).getTime();

    expect(d1).toBeGreaterThan(startMs);
    expect(d2).toBeGreaterThan(d1);
    expect(d3).toBeGreaterThan(d2);
    expect(d3).toBe(endMs);

    // Subtasks under Milestone 1 must be within [startMs, d1]
    const sub1 = new Date(distributed[0].children![0].dueDate!).getTime();
    const sub2 = new Date(distributed[0].children![1].dueDate!).getTime();

    expect(sub1).toBeGreaterThan(startMs);
    expect(sub2).toBeGreaterThan(sub1);
    expect(sub2).toBeLessThan(d1);
  });
});

describe('Curriculum Fallback Study Plan Generator', () => {
  it('generates appropriate Language Arts study plan without math formulas', () => {
    const classification = classifyStudyContext(
      'Naskah Drama Paguneman Sunda',
      'Bahasa & Sastra'
    );
    const startMs = Date.now();
    const endMs = startMs + 5 * 24 * 60 * 60 * 1000;

    const plan = generateCurriculumFallbackStudyPlan(
      'Naskah Drama Paguneman Sunda',
      classification,
      startMs,
      endMs,
      5
    );

    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(5);

    // Check that no tasks or subtasks have latexFormula
    for (const item of plan) {
      expect(item.latexFormula).toBeUndefined();
      if (item.children) {
        for (const child of item.children) {
          expect(child.latexFormula).toBeUndefined();
        }
      }
    }
  });

  it('generates STEM study plan with appropriate latex formulas and node coordinates', () => {
    const classification = classifyStudyContext(
      'Kalkulus Diferensial dan Integral',
      'Matematika'
    );
    const startMs = Date.now();
    const endMs = startMs + 7 * 24 * 60 * 60 * 1000;

    const plan = generateCurriculumFallbackStudyPlan(
      'Kalkulus Diferensial dan Integral',
      classification,
      startMs,
      endMs,
      5
    );

    expect(plan.length).toBeGreaterThan(0);
    const firstStem = plan[0];
    expect(firstStem.latexFormula).toBeDefined();
    expect(firstStem.canvasNodeId).toBeDefined();
    expect(typeof firstStem.nodeX).toBe('number');
  });
});
