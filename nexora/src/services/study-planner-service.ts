import { GoogleGenAI } from '@google/genai';
import {
  getApiKeyPool,
  getModelCascade,
  isKeyExhaustedOrInvalid,
  isTransientError,
  delayWithJitter,
} from '@/services/ai-cascade';
import { classifyStudyContext } from '@/services/study-planner-classifier';
import type {
  GradeLevel,
  PlannerGeneratePayload,
  StudyContextClassification,
} from '@/types/planner';
import type { PlannerTaskItem, TaskPriority } from '@/types/task';

/**
 * Distributes milestones and subtasks chronologically forward across the target timeline.
 * Prevents newly generated plans from starting in an instantaneous overdue state.
 */
export function distributeForwardChronologicalDeadlines(
  items: PlannerTaskItem[],
  startMs: number = Date.now(),
  endMs?: number
): PlannerTaskItem[] {
  if (!items || items.length === 0) return [];

  // Default target is 7 days from now if not specified or invalid
  const targetEndMs =
    endMs && endMs > startMs + 1000 * 60 * 60
      ? endMs
      : startMs + 7 * 24 * 60 * 60 * 1000;

  const totalDuration = targetEndMs - startMs;
  const n = items.length;

  return items.map((item, idx) => {
    // Root milestone interval [milestoneStartMs, milestoneEndMs]
    const milestoneStartFraction = idx / n;
    const milestoneEndFraction = (idx + 1) / n;

    const milestoneStartMs = startMs + milestoneStartFraction * totalDuration;
    const milestoneEndMs = startMs + milestoneEndFraction * totalDuration;
    const milestoneDate = new Date(milestoneEndMs);

    let distributedChildren: PlannerTaskItem[] | undefined = undefined;

    if (item.children && item.children.length > 0) {
      const childCount = item.children.length;
      const childWindow = milestoneEndMs - milestoneStartMs;

      distributedChildren = item.children.map((child, cIdx) => {
        const childFraction = (cIdx + 1) / (childCount + 1);
        const childMs = milestoneStartMs + childFraction * childWindow;
        return {
          ...child,
          dueDate: new Date(childMs).toISOString(),
        };
      });
    }

    return {
      ...item,
      dueDate: milestoneDate.toISOString(),
      children: distributedChildren,
    };
  });
}

/**
 * Fallback study plan generator tailored to Subject Category and Grade Level.
 */
export function generateCurriculumFallbackStudyPlan(
  prompt: string,
  classification: StudyContextClassification,
  startMs: number = Date.now(),
  endMs?: number,
  maxTasks: number = 8
): PlannerTaskItem[] {
  const { subject, subjectCategory, gradeLevel, forbidMathFormulas } = classification;
  const cleanTitle = prompt.length > 50 ? `${prompt.slice(0, 50)}...` : prompt;

  let rawMilestones: PlannerTaskItem[] = [];

  if (subjectCategory === 'LANGUAGE_LITERATURE') {
    rawMilestones = [
      {
        title: `Fase 1: Pemahaman Tema & Kosakata Inti (${subject})`,
        description: `Pelajari kosakata utama, tata bahasa, dan analisis struktur naskah/teks untuk ${cleanTitle}.`,
        priority: 'high' as TaskPriority,
        children: [
          {
            title: 'Identifikasi kosakata kunci & kaidah kebahasaan',
            description: 'Buat daftar istilah, ungkapan, dan struktur tata bahasa relevan.',
            priority: 'medium' as TaskPriority,
          },
          {
            title: 'Analisis referensi teks / draf naskah awal',
            description: 'Pahami konteks, alur dialog/argumen, dan karakter penyampaian.',
            priority: 'medium' as TaskPriority,
          },
        ],
      },
      {
        title: `Fase 2: Penyusunan Draf & Latihan Olah Vokal / Pelafalan`,
        description: `Tulis draf lengkap naskah dialog/esai dan lakukan latihan artikulasi, intonasi, serta kelancaran berbicara.`,
        priority: 'urgent' as TaskPriority,
        children: [
          {
            title: 'Tulis draf lengkap naskah / dialog',
            description: 'Kembangkan pembagian peran, dialog, atau argumen esai secara runtut.',
            priority: 'high' as TaskPriority,
          },
          {
            title: 'Latihan pelafalan, intonasi, & pelafalan kata',
            description: 'Latih artikulasi suara dan kesesuaian nada bicara dengan tema.',
            priority: 'high' as TaskPriority,
          },
        ],
      },
      {
        title: `Fase 3: Gladi Bersih, Umpan Balik, & Finalisasi Penampilan`,
        description: `Lakukan simulasi penampilan menyeluruh, perbaiki kekurangan berdasarkan umpan balik, dan siap tampil.`,
        priority: 'medium' as TaskPriority,
        children: [
          {
            title: 'Gladi bersih simulasi presentasi / peran',
            description: 'Latih penampilan penuh dengan memperhatikan ketepatan waktu.',
            priority: 'medium' as TaskPriority,
          },
          {
            title: 'Evaluasi akhir dan penyempurnaan karya',
            description: 'Koreksi akhir tata bahasa, format naskah, dan kesiapan penampilan.',
            priority: 'low' as TaskPriority,
          },
        ],
      },
    ];
  } else if (subjectCategory === 'SOCIAL_HUMANITIES') {
    rawMilestones = [
      {
        title: `Tahap 1: Eksplorasi Sumber & Penyusunan Linimasa (${subject})`,
        description: `Kaji materi utama, identifikasi peristiwa/pasal penting, dan susun linimasa kronologis untuk ${cleanTitle}.`,
        priority: 'high' as TaskPriority,
        children: [
          {
            title: 'Pemetaan konsep dasar & tokoh / pasal kunci',
            description: 'Rangkum konsep penting dan hubungan kausalitas antar peristiwa.',
            priority: 'medium' as TaskPriority,
          },
          {
            title: 'Penyusunan linimasa kronologis / peta konsep',
            description: 'Hubungkan latar belakang, proses, dan dampak secara terstruktur.',
            priority: 'medium' as TaskPriority,
          },
        ],
      },
      {
        title: `Tahap 2: Analisis Kausalitas & Pendalaman Kasus`,
        description: `Analisis keterkaitan sebab-akibat, studi kasus nyata, dan diskusikan solusi atau hikmah dari ${cleanTitle}.`,
        priority: 'urgent' as TaskPriority,
        children: [
          {
            title: 'Kaji studi kasus atau dinamika peristiwa',
            description: 'Uji pemahaman dengan studi kasus dan perbandingan teori.',
            priority: 'high' as TaskPriority,
          },
          {
            title: 'Latihan soal analisis & pembuatan flashcard rangkuman',
            description: 'Perkuat memori dengan flashcard fakta dan kuis konsep.',
            priority: 'high' as TaskPriority,
          },
        ],
      },
      {
        title: `Tahap 3: Sintesis Esai Reflektif & Evaluasi Pemahaman`,
        description: `Tulis kesimpulan komprehensif, tinjau kembali peta konsep, dan siapkan rangkuman siap ujian/presentasi.`,
        priority: 'medium' as TaskPriority,
        children: [
          {
            title: 'Penyusunan rangkuman akhir & esai argumentatif',
            description: 'Satukan semua poin pembahasan menjadi kesimpulan utuh.',
            priority: 'low' as TaskPriority,
          },
        ],
      },
    ];
  } else if (subjectCategory === 'STEM_ANALYTICAL') {
    rawMilestones = [
      {
        title: `Langkah 1: Penguasaan Konsep & Teorema Dasar (${subject})`,
        description: `Pahami definisi matematis, hukum fisika/kimia, dan pembuktian rumus dasar untuk ${cleanTitle}.`,
        priority: 'high' as TaskPriority,
        canvasNodeId: 'node-stem-1',
        nodeX: 0,
        nodeY: 0,
        latexFormula: forbidMathFormulas ? undefined : 'f(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}',
        children: [
          {
            title: 'Kajian rumus inti & syarat batas',
            description: 'Pahami variabel, satuan fisis, dan penurunan rumus dasar.',
            priority: 'medium' as TaskPriority,
            canvasNodeId: 'node-stem-1-1',
            nodeX: 280,
            nodeY: -50,
          },
          {
            title: 'Latihan 5 soal konsep dasar & verifikasi langkah',
            description: 'Kerjakan soal latihan dasar untuk menguji pemahaman definisi.',
            priority: 'medium' as TaskPriority,
            canvasNodeId: 'node-stem-1-2',
            nodeX: 280,
            nodeY: 50,
          },
        ],
      },
      {
        title: `Langkah 2: Latihan Soal Bertingkat & Analisis HOTS`,
        description: `Selesaikan variasi soal tingkat menengah hingga HOTS dan uji pemahaman dengan kombinasi variabel.`,
        priority: 'urgent' as TaskPriority,
        canvasNodeId: 'node-stem-2',
        nodeX: 0,
        nodeY: 260,
        latexFormula: forbidMathFormulas ? undefined : 'S_n = \\frac{n}{2}\\left(2a + (n-1)b\\right)',
        children: [
          {
            title: 'Penyelesaian soal tipe ujian & manipulasi aljabar',
            description: 'Analisis soal bertingkat dan catat trik penyelesaian cepat.',
            priority: 'high' as TaskPriority,
            canvasNodeId: 'node-stem-2-1',
            nodeX: 280,
            nodeY: 210,
          },
          {
            title: 'Simulasi tryout mandiri berbatas waktu',
            description: 'Ukur kecepatan dan akurasi pengerjaan soal dalam durasi terukur.',
            priority: 'high' as TaskPriority,
            canvasNodeId: 'node-stem-2-2',
            nodeX: 280,
            nodeY: 310,
          },
        ],
      },
      {
        title: `Langkah 3: Evaluasi Kelemahan & Ringkasan Rumus`,
        description: `Analisis kesalahan pada latihan sebelumnya, perbaiki konsep yang belum mantap, dan siapkan lembar contekan rumus resmi.`,
        priority: 'medium' as TaskPriority,
        canvasNodeId: 'node-stem-3',
        nodeX: 0,
        nodeY: 520,
        children: [
          {
            title: 'Review buku catatan rumus & uji kasus batas',
            description: 'Pastikan seluruh rumus dan logika penurunan telah dikuasai sempurna.',
            priority: 'low' as TaskPriority,
            canvasNodeId: 'node-stem-3-1',
            nodeX: 280,
            nodeY: 520,
          },
        ],
      },
    ];
  } else {
    rawMilestones = [
      {
        title: `Fase 1: Perencanaan Proyek & Pembagian Peran (${cleanTitle})`,
        description: `Tentukan sasaran capaian, jadwal kerja tim, dan pembagian tugas awal.`,
        priority: 'high' as TaskPriority,
        children: [
          {
            title: 'Penyusunan rencana kerja & pengumpulan bahan',
            description: 'Kumpulkan referensi dan tentukan alat serta media yang diperlukan.',
            priority: 'medium' as TaskPriority,
          },
        ],
      },
      {
        title: `Fase 2: Eksekusi & Pembuatan Deliverable Utama`,
        description: `Lakukan pengerjaan konten proyek, draf laporan, dan materi presentasi.`,
        priority: 'urgent' as TaskPriority,
        children: [
          {
            title: 'Pengerjaan draf utama proyek',
            description: 'Selesaikan bagian inti dari tugas atau produk proyek.',
            priority: 'high' as TaskPriority,
          },
        ],
      },
      {
        title: `Fase 3: Review, Revisi, & Presentasi Akhir`,
        description: `Lakukan penyempurnaan akhir dan siapkan laporan deliverable.`,
        priority: 'medium' as TaskPriority,
        children: [
          {
            title: 'Finalisasi laporan & presentasi',
            description: 'Kirimkan hasil kerja dan lakukan evaluasi bersama.',
            priority: 'low' as TaskPriority,
          },
        ],
      },
    ];
  }

  // If Primary grade, simplify sub-tasks
  if (gradeLevel === 'PRIMARY') {
    rawMilestones = rawMilestones.map((m) => ({
      ...m,
      title: m.title.replace(/Fase \d+:|Tahap \d+:|Langkah \d+:/, 'Kegiatan:'),
      description: m.description,
      children: m.children?.slice(0, 2),
    }));
  }

  const distributed = distributeForwardChronologicalDeadlines(
    rawMilestones,
    startMs,
    endMs
  );

  return distributed.slice(0, maxTasks);
}

/**
 * Builds dynamic system prompt based on Grade Level and Subject Category.
 */
function buildCurriculumSystemInstruction(
  classification: StudyContextClassification,
  maxTasks: number
): string {
  const { subject, subjectCategory, gradeLevel, forbidMathFormulas } =
    classification;

  const gradeDirectives = {
    PRIMARY: `TARGET AUDIENCE: Sekolah Dasar (SD / Primary School, Grades 1-6).
- Break down tasks into short, fun, simple, and guided 15-25 minute learning steps.
- Use encouraging, clear Indonesian terminology without complex jargon.
- Maximum 2 subtasks per milestone.`,
    JUNIOR_HIGH: `TARGET AUDIENCE: Sekolah Menengah Pertama (SMP / Junior High School, Grades 7-9).
- Structure milestones with clear concept definitions, guided exercises, and 30-45 minute task chunks.
- Emphasize foundational understanding, structured study habits, and systematic review.`,
    SENIOR_HIGH: `TARGET AUDIENCE: Sekolah Menengah Atas / Kejuruan / Universitas (SMA/SMK/University, Grades 10-12 & Higher Ed).
- Provide rigorous academic depth, analytical scaffolding, HOTS problem solving, and 45-90 minute deep-work sessions.
- Emphasize proof derivations, critical evaluation, exam strategy (UTBK/SNBT/UAS), and scholarly precision.`,
  }[gradeLevel];

  let subjectRule = '';

  if (subjectCategory === 'LANGUAGE_LITERATURE') {
    subjectRule = `CRITICAL SUBJECT DIRECTIVE (Language & Literature — ${subject}):
- STRICTLY FORBID all mathematical formulas, equations, theorems, and LaTeX notation!
- The 'latexFormula' property MUST be omitted or null for all tasks.
- Structure milestones according to Language Arts pedagogy:
  1. Vocabulary acquisition, grammar/linguistic conventions, and theme exploration.
  2. Outline/script drafting, pronunciation, intonation, and speaking drills.
  3. Roleplay/dialogue dry-runs, peer editing, and presentation delivery cues.`;
  } else if (subjectCategory === 'SOCIAL_HUMANITIES') {
    subjectRule = `CRITICAL SUBJECT DIRECTIVE (Social Studies & Humanities — ${subject}):
- Focus on chronological timelines, primary sources, cause-and-effect kausalitas, constitutional articles, and thematic synthesis.
- DO NOT output mathematical formulas unless specific economic equations/accounting tables are needed.
- Structure milestones with timeline building, flashcards, concept comparison, and structured essay writing.`;
  } else if (subjectCategory === 'STEM_ANALYTICAL') {
    subjectRule = `CRITICAL SUBJECT DIRECTIVE (STEM & Analytical — ${subject}):
- Emphasize step-by-step problem sets, formula verification, limit/boundary checking, and timed exam simulations.
- Include accurate LaTeX math formulas in 'latexFormula' (e.g. "\\\\int f(x) dx", "E = mc^2", "\\\\vec{F} = m\\\\vec{a}").
- Provide spatial canvas coordinates for STEM Canvas rendering:
  * Root milestones at nodeX: 0, nodeY: 0, 240, 480, ...
  * Sub-items at nodeX: 280, with relative vertical spacing.`;
  } else {
    subjectRule = `CRITICAL SUBJECT DIRECTIVE (Project & General — ${subject}):
- Structure milestones with project scoping, task division, research drafting, revision, and deliverable presentation.`;
  }

  return `You are Nexora AI Study Planner, an intelligent curriculum-aligned academic planner.
Your goal is to generate an actionable, hierarchical study plan conforming strictly to the student's grade level and subject domain.

${gradeDirectives}

${subjectRule}

RULES:
1. Return ONLY a valid JSON array of tasks matching the PlannerTaskItem schema.
2. Max hierarchy depth is 2 levels (root tasks with optional children; do NOT nest deeper).
3. Max total root milestones should not exceed ${maxTasks}.
4. Priority must be one of: "low", "medium", "high", "urgent".
5. ${forbidMathFormulas ? "STRICTLY OMIT 'latexFormula' (set to undefined/null)." : "Include 'latexFormula' where relevant."}

Schema Example:
[
  {
    "title": "Fase 1: ...",
    "description": "...",
    "priority": "high",
    "children": [
      {
        "title": "Subtask 1.1: ...",
        "description": "...",
        "priority": "medium"
      }
    ]
  }
]`;
}

/**
 * Generates a curriculum-aware study plan using Gemini AI with Multi-Key Pool,
 * Grade Calibration, Subject Classification, and Forward Chronological Timeline Distribution.
 */
export async function generateCurriculumStudyPlan(
  payload: PlannerGeneratePayload,
  customApiKey?: string | null
): Promise<PlannerTaskItem[]> {
  const { prompt, category, dueDate, gradeLevel, maxTasks = 8 } = payload;
  const startMs = Date.now();
  const endMs = dueDate ? new Date(dueDate).getTime() : undefined;

  // 1. Classify subject, category, and grade tier
  const classification = classifyStudyContext(prompt, category, gradeLevel);

  const keyPool = getApiKeyPool(customApiKey);

  if (keyPool.length === 0) {
    console.warn('[AI Study Planner] No valid GEMINI_API_KEY found. Generating curriculum fallback plan.');
    return generateCurriculumFallbackStudyPlan(
      prompt,
      classification,
      startMs,
      endMs,
      maxTasks
    );
  }

  try {
    const systemInstruction = buildCurriculumSystemInstruction(
      classification,
      maxTasks
    );

    const userPrompt = `Study Goal / Assignment: ${prompt}
Detected Subject: ${classification.subject} (${classification.subjectCategory})
Grade Level: ${classification.gradeLevel}
Target Deadline: ${dueDate || 'Within 7 days'}
Max Milestones: ${maxTasks}

Generate the structured, curriculum-calibrated study plan now:`;

    const cascade = getModelCascade();
    let responseText: string | null = null;
    let lastError: unknown = null;

    for (let m = 0; m < cascade.length; m++) {
      const candidateModel = cascade[m];

      for (let k = 0; k < keyPool.length; k++) {
        const currentKey = keyPool[k];
        try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          const response = await ai.models.generateContent({
            model: candidateModel,
            contents: userPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          });

          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(
            `[Study Planner AI Error] Key ${k}/${keyPool.length}, Model "${candidateModel}":`,
            err instanceof Error ? err.message : err
          );

          if (isKeyExhaustedOrInvalid(err) && k < keyPool.length - 1) {
            await delayWithJitter(200, 100);
            continue;
          }

          if (isTransientError(err)) {
            break;
          }
        }
      }

      if (responseText) {
        break;
      }

      if (m < cascade.length - 1) {
        await delayWithJitter(300, 150);
      }
    }

    if (!responseText) {
      console.warn('[Study Planner AI] All cascade attempts failed, using fallback:', lastError);
      return generateCurriculumFallbackStudyPlan(
        prompt,
        classification,
        startMs,
        endMs,
        maxTasks
      );
    }

    const parsed: unknown = JSON.parse(responseText);

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid response structure: expected JSON array');
    }

    const validateItem = (
      item: unknown,
      idx: number
    ): PlannerTaskItem => {
      const obj = item as Record<string, unknown>;
      const title =
        typeof obj.title === 'string' && obj.title.trim()
          ? obj.title.trim()
          : `Milestone ${idx + 1}`;
      const description =
        typeof obj.description === 'string' ? obj.description : undefined;
      const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
      const priority = validPriorities.includes(obj.priority as TaskPriority)
        ? (obj.priority as TaskPriority)
        : 'medium';

      const canvasNodeId =
        typeof obj.canvasNodeId === 'string'
          ? obj.canvasNodeId
          : `node-plan-${idx + 1}`;
      const nodeX = typeof obj.nodeX === 'number' ? obj.nodeX : 0;
      const nodeY = typeof obj.nodeY === 'number' ? obj.nodeY : idx * 240;
      const latexFormula =
        !classification.forbidMathFormulas && typeof obj.latexFormula === 'string'
          ? obj.latexFormula
          : undefined;

      const rawChildren = Array.isArray(obj.children) ? obj.children : [];
      const children: PlannerTaskItem[] = rawChildren.map((child, cIdx) => {
        const childObj = child as Record<string, unknown>;
        return {
          title:
            typeof childObj.title === 'string' && childObj.title.trim()
              ? childObj.title.trim()
              : `Subtask ${idx + 1}.${cIdx + 1}`,
          description:
            typeof childObj.description === 'string'
              ? childObj.description
              : undefined,
          priority: validPriorities.includes(childObj.priority as TaskPriority)
            ? (childObj.priority as TaskPriority)
            : 'medium',
          canvasNodeId:
            typeof childObj.canvasNodeId === 'string'
              ? childObj.canvasNodeId
              : `node-plan-${idx + 1}-${cIdx + 1}`,
          nodeX: typeof childObj.nodeX === 'number' ? childObj.nodeX : 280,
          nodeY:
            typeof childObj.nodeY === 'number'
              ? childObj.nodeY
              : nodeY + (cIdx === 0 ? -60 : (cIdx - 1) * 60 + 60),
          latexFormula:
            !classification.forbidMathFormulas &&
            typeof childObj.latexFormula === 'string'
              ? childObj.latexFormula
              : undefined,
        };
      });

      return {
        title,
        description,
        priority,
        canvasNodeId,
        nodeX,
        nodeY,
        latexFormula,
        children: children.length > 0 ? children : undefined,
      };
    };

    const validatedItems = parsed.map(validateItem).slice(0, maxTasks);

    if (validatedItems.length === 0) {
      return generateCurriculumFallbackStudyPlan(
        prompt,
        classification,
        startMs,
        endMs,
        maxTasks
      );
    }

    // 4. Apply forward chronological timeline distribution
    return distributeForwardChronologicalDeadlines(
      validatedItems,
      startMs,
      endMs
    );
  } catch (error) {
    console.error('[Study Planner AI] Generation error, falling back:', error);
    return generateCurriculumFallbackStudyPlan(
      prompt,
      classification,
      startMs,
      endMs,
      maxTasks
    );
  }
}
