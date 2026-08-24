import {
  CURRICULUM_TAXONOMY,
  type GradeLevel,
  type SubjectCategory,
  type StudyContextClassification,
  type SubjectTaxonomyEntry,
} from '@/types/planner';

/**
 * Detects Grade Level from goal or explicit keywords.
 * Defaults to 'SENIOR_HIGH' (Indonesian SMA / University standard).
 */
export function detectGradeLevel(
  text: string,
  userGrade?: GradeLevel
): GradeLevel {
  if (userGrade) return userGrade;

  const lower = text.toLowerCase();

  // Primary / SD patterns
  if (
    /\b(sd|sekolah dasar|primary|kelas\s*[1-6]|sd\s*kelas|kelas\s*i{1,3}|kelas\s*iv|kelas\s*v|kelas\s*vi)\b/i.test(
      lower
    )
  ) {
    return 'PRIMARY';
  }

  // Junior High / SMP patterns
  if (
    /\b(smp|sekolah menengah pertama|junior high|kelas\s*[7-9]|smp\s*kelas|kelas\s*vii|kelas\s*viii|kelas\s*ix)\b/i.test(
      lower
    )
  ) {
    return 'JUNIOR_HIGH';
  }

  // Senior High / SMA patterns & Advanced Default
  return 'SENIOR_HIGH';
}

/**
 * Classifies a study topic or assignment prompt against the Curriculum Taxonomy.
 * Extracts matched subject, subject category, grade calibration, and formula constraints.
 */
export function classifyStudyContext(
  goal: string,
  description: string = '',
  userGrade?: GradeLevel
): StudyContextClassification {
  const combinedText = `${goal} ${description}`.toLowerCase().trim();
  const detectedGrade = detectGradeLevel(combinedText, userGrade);

  let bestEntry: SubjectTaxonomyEntry | null = null;
  let highestScore = 0;
  let matchedKeywords: string[] = [];

  for (const entry of CURRICULUM_TAXONOMY) {
    let score = 0;
    const currentMatches: string[] = [];

    for (const kw of entry.keywords) {
      const lowerKw = kw.toLowerCase();
      // Phrase or token match
      if (combinedText.includes(lowerKw)) {
        // Multi-word phrase matches receive higher confidence weighting
        const weight = lowerKw.split(/\s+/).length >= 2 ? 3 : 1.5;
        score += weight;
        currentMatches.push(kw);
      }
    }

    // Boost if subject name is directly in text
    if (combinedText.includes(entry.name.toLowerCase())) {
      score += 4;
    }

    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
      matchedKeywords = currentMatches;
    }
  }

  // Fallback if no specific keywords matched
  if (!bestEntry || highestScore === 0) {
    const isMathOrPhysicsKeyword =
      /\b(hitung|rumus|turunan|integral|angka|persamaan|soal|nomor|grafik|koordinat)\b/i.test(
        combinedText
      );

    if (isMathOrPhysicsKeyword) {
      const mathEntry = CURRICULUM_TAXONOMY.find((e) => e.id === 'mathematics')!;
      return {
        subject: mathEntry.name,
        subjectCategory: 'STEM_ANALYTICAL',
        gradeLevel: detectedGrade,
        confidenceScore: 0.5,
        detectedKeywords: ['analisis kuantitatif'],
        suggestedFocusAreas: mathEntry.defaultFocusAreas,
        forbidMathFormulas: false,
      };
    }

    const generalEntry = CURRICULUM_TAXONOMY.find(
      (e) => e.id === 'general_project'
    )!;
    return {
      subject: 'Proyek Pembelajaran Umum',
      subjectCategory: 'GENERAL_PROJECT',
      gradeLevel: detectedGrade,
      confidenceScore: 0.4,
      detectedKeywords: [],
      suggestedFocusAreas: generalEntry.defaultFocusAreas,
      forbidMathFormulas: true,
    };
  }

  // Forbid mathematical formulas for Language/Literature and Social/Humanities
  // (Unless explicit economics/accounting equations are detected)
  const forbidMathFormulas =
    bestEntry.category === 'LANGUAGE_LITERATURE' ||
    (bestEntry.category === 'SOCIAL_HUMANITIES' &&
      !/\b(akuntansi|neraca|jurnal|laba|rugi|bunga|pajak)\b/i.test(combinedText));

  return {
    subject: bestEntry.name,
    subjectCategory: bestEntry.category,
    gradeLevel: detectedGrade,
    confidenceScore: Math.min(1, Math.max(0.6, highestScore / 6)),
    detectedKeywords: matchedKeywords,
    suggestedFocusAreas: bestEntry.defaultFocusAreas,
    forbidMathFormulas,
  };
}
