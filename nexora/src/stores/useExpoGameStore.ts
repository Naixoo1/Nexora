import { create } from 'zustand';
import type {
  ExpoGradeTier,
  ExpoQuestion,
  ExpoRoundResult,
  ExpoGameSummary,
  ExpoGamePhase,
} from '@/types/expo';
import { getQuestionsByGradeTier } from '@/data/expo-questions';

export interface ExpoGameStoreState {
  // Game Lifecycle
  gamePhase: ExpoGamePhase;
  selectedGrade: ExpoGradeTier;
  questions: ExpoQuestion[];
  currentIndex: number;
  currentQuestion: ExpoQuestion | null;

  // Round Dynamics
  timeRemaining: number;
  maxTimeForRound: number;
  score: number;
  streak: number;
  maxStreak: number;
  hintsRevealed: number;

  // AI Socratic Clue Assistant
  aiClue: string | null;
  isFetchingClue: boolean;
  clueError: string | null;

  // Input & Evaluation
  selectedOption: string | null;
  textAnswerInput: string;
  roundResults: ExpoRoundResult[];
  lastRoundResult: ExpoRoundResult | null;

  // Final Summary
  gameSummary: ExpoGameSummary | null;

  // Actions
  selectGradeTier: (grade: ExpoGradeTier) => void;
  startGame: (grade?: ExpoGradeTier) => void;
  selectOption: (option: string) => void;
  setTextAnswer: (text: string) => void;
  submitAnswer: (customAnswer?: string) => void;
  nextQuestion: () => void;
  revealHint: () => void;
  requestAiSocraticClue: () => Promise<void>;
  tickTimer: () => void;
  resetGame: () => void;
}

/**
 * Normalizes answer text for flexible matching.
 */
export function normalizeAnswer(ans: string): string {
  return ans
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Evaluates whether a user's answer matches the target answer or acceptable variations.
 */
export function evaluateAnswerMatch(
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers?: string[]
): boolean {
  const normUser = normalizeAnswer(userAnswer);
  const normCorrect = normalizeAnswer(correctAnswer);

  if (normUser === normCorrect) return true;

  // Check if option text starts with user input or vice versa
  if (normCorrect.includes(normUser) && normUser.length >= 2) return true;
  if (normUser.includes(normCorrect)) return true;

  // Check acceptable answers list
  if (acceptableAnswers && acceptableAnswers.length > 0) {
    for (const alt of acceptableAnswers) {
      const normAlt = normalizeAnswer(alt);
      if (normUser === normAlt || normUser.includes(normAlt) || normAlt.includes(normUser)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Computes the score for a round based on speed, streak, and hints used.
 */
export function calculateRoundScore(
  basePoints: number,
  timeSpentSeconds: number,
  maxTimeSeconds: number,
  currentStreak: number,
  hintsUsed: number
): number {
  // Speed bonus: up to +30 points if answered quickly
  const timeRatio = Math.max(0, 1 - timeSpentSeconds / maxTimeSeconds);
  const speedBonus = Math.round(timeRatio * 30);

  // Hint deduction: -15 points per hint
  const hintDeduction = hintsUsed * 15;

  // Streak Multiplier
  const multiplier = currentStreak >= 3 ? 1.5 : currentStreak >= 2 ? 1.25 : 1.0;

  const rawScore = (basePoints + speedBonus - hintDeduction) * multiplier;
  return Math.max(25, Math.round(rawScore));
}

export const useExpoGameStore = create<ExpoGameStoreState>((set, get) => ({
  gamePhase: 'WELCOME',
  selectedGrade: 'PRIMARY',
  questions: [],
  currentIndex: 0,
  currentQuestion: null,

  timeRemaining: 60,
  maxTimeForRound: 60,
  score: 0,
  streak: 0,
  maxStreak: 0,
  hintsRevealed: 0,

  aiClue: null,
  isFetchingClue: false,
  clueError: null,

  selectedOption: null,
  textAnswerInput: '',
  roundResults: [],
  lastRoundResult: null,

  gameSummary: null,

  selectGradeTier: (grade) => {
    set({ selectedGrade: grade });
  },

  startGame: (grade) => {
    const tier = grade || get().selectedGrade;
    const questionsList = getQuestionsByGradeTier(tier);
    const firstQ = questionsList[0] || null;
    const timeLimit = firstQ?.timeLimitSeconds || 60;

    set({
      gamePhase: 'PLAYING',
      selectedGrade: tier,
      questions: questionsList,
      currentIndex: 0,
      currentQuestion: firstQ,
      timeRemaining: timeLimit,
      maxTimeForRound: timeLimit,
      score: 0,
      streak: 0,
      maxStreak: 0,
      hintsRevealed: 0,
      aiClue: null,
      isFetchingClue: false,
      clueError: null,
      selectedOption: null,
      textAnswerInput: '',
      roundResults: [],
      lastRoundResult: null,
      gameSummary: null,
    });
  },

  selectOption: (option) => {
    set({ selectedOption: option, textAnswerInput: option });
  },

  setTextAnswer: (text) => {
    set({ textAnswerInput: text });
  },

  submitAnswer: (customAnswer) => {
    const {
      currentQuestion,
      selectedOption,
      textAnswerInput,
      timeRemaining,
      maxTimeForRound,
      streak,
      maxStreak,
      score,
      hintsRevealed,
      roundResults,
    } = get();

    if (!currentQuestion) return;

    const finalAnswer = (customAnswer || selectedOption || textAnswerInput || '').trim();
    const timeSpent = Math.max(1, maxTimeForRound - timeRemaining);

    const isCorrect = evaluateAnswerMatch(
      finalAnswer,
      currentQuestion.correctAnswer,
      currentQuestion.acceptableAnswers
    );

    let roundScore = 0;
    let newStreak = streak;

    if (isCorrect) {
      newStreak = streak + 1;
      roundScore = calculateRoundScore(
        currentQuestion.points,
        timeSpent,
        maxTimeForRound,
        newStreak,
        hintsRevealed
      );
    } else {
      newStreak = 0;
      roundScore = 0;
    }

    const roundResult: ExpoRoundResult = {
      questionId: currentQuestion.id,
      questionTitle: currentQuestion.title,
      userAnswer: finalAnswer || '(Tidak Dijawab)',
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timeSpentSeconds: timeSpent,
      hintsUsedCount: hintsRevealed,
      scoreEarned: roundScore,
    };

    const newRoundResults = [...roundResults, roundResult];
    const newMaxStreak = Math.max(maxStreak, newStreak);
    const newTotalScore = score + roundScore;

    set({
      gamePhase: 'FEEDBACK',
      score: newTotalScore,
      streak: newStreak,
      maxStreak: newMaxStreak,
      roundResults: newRoundResults,
      lastRoundResult: roundResult,
    });
  },

  nextQuestion: () => {
    const { questions, currentIndex, roundResults, score, maxStreak, selectedGrade } = get();
    const nextIdx = currentIndex + 1;

    if (nextIdx < questions.length) {
      const nextQ = questions[nextIdx];
      const timeLimit = nextQ.timeLimitSeconds || 60;

      set({
        gamePhase: 'PLAYING',
        currentIndex: nextIdx,
        currentQuestion: nextQ,
        timeRemaining: timeLimit,
        maxTimeForRound: timeLimit,
        hintsRevealed: 0,
        aiClue: null,
        isFetchingClue: false,
        clueError: null,
        selectedOption: null,
        textAnswerInput: '',
        lastRoundResult: null,
      });
    } else {
      // Game Completed -> Build Final Summary Certificate
      const totalQuestions = questions.length;
      const correctCount = roundResults.filter((r) => r.isCorrect).length;
      const accuracyPercentage = Math.round((correctCount / totalQuestions) * 100);
      const totalTimeSpentSeconds = roundResults.reduce((acc, r) => acc + r.timeSpentSeconds, 0);
      const maxPossibleScore = questions.reduce((acc, q) => acc + q.points * 1.5 + 30, 0);

      let badgeAwarded = {
        title: 'Grandmaster AI Solver',
        subtitle: 'Akurasi Legendaris & Penalaran Cepat',
        icon: 'Crown',
      };

      if (accuracyPercentage < 50) {
        badgeAwarded = {
          title: 'Curious Explorer',
          subtitle: 'Semangat Pantang Menyerah',
          icon: 'Sparkles',
        };
      } else if (accuracyPercentage < 75) {
        badgeAwarded = {
          title: 'Rising Scholar',
          subtitle: 'Pemecah Masalah Berbakat',
          icon: 'Award',
        };
      } else if (accuracyPercentage < 90) {
        badgeAwarded = {
          title: 'Master Deductor',
          subtitle: 'Logika Tangkas & Tepat',
          icon: 'ShieldCheck',
        };
      }

      const summary: ExpoGameSummary = {
        gradeTier: selectedGrade,
        totalScore: score,
        maxPossibleScore: Math.round(maxPossibleScore),
        correctCount,
        totalQuestions,
        accuracyPercentage,
        totalTimeSpentSeconds,
        streakMax: maxStreak,
        badgeAwarded,
        completedAt: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      };

      set({
        gamePhase: 'SUMMARY',
        gameSummary: summary,
        currentQuestion: null,
      });
    }
  },

  revealHint: () => {
    const { currentQuestion, hintsRevealed } = get();
    if (!currentQuestion) return;
    if (hintsRevealed < currentQuestion.hints.length) {
      set({ hintsRevealed: hintsRevealed + 1 });
    }
  },

  requestAiSocraticClue: async () => {
    const { currentQuestion, selectedGrade, isFetchingClue } = get();
    if (!currentQuestion || isFetchingClue) return;

    set({ isFetchingClue: true, clueError: null });

    try {
      const cluePrompt = `Saya sedang mengerjakan soal cerita untuk tingkat ${selectedGrade}:
"${currentQuestion.storyScenario}"
Berikan petunjuk berpikir (Socratic hint) maksimal 2 kalimat ramah yang membimbing cara berpikir tanpa membocorkan jawaban akhirnya.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-grade-level': selectedGrade,
        },
        body: JSON.stringify({
          message: cluePrompt,
          mode: 'socratic',
          context: {
            tutorMode: 'socratic',
            gradeLevel: selectedGrade,
            customInstructions:
              'Berikan petunjuk Socratic berpikir ramah maksimal 2 kalimat. Jangan bocorkan angka jawaban akhir.',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal mendapatkan hint dari AI');
      }

      const text = await response.text();
      set({ aiClue: text.trim(), isFetchingClue: false });
    } catch (err) {
      console.warn('[Expo Clue Assistant]: AI fetch fallback:', err);
      // Fallback to pre-seeded static hint if available
      const staticHint = currentQuestion.hints[0] || 'Coba perhatikan kata kunci dan angka pada cerita.';
      set({
        aiClue: `💡 Petunjuk: ${staticHint}`,
        isFetchingClue: false,
      });
    }
  },

  tickTimer: () => {
    const { gamePhase, timeRemaining } = get();
    if (gamePhase !== 'PLAYING') return;

    if (timeRemaining > 1) {
      set({ timeRemaining: timeRemaining - 1 });
    } else {
      // Time is up -> Auto-submit current answer or timeout
      set({ timeRemaining: 0 });
      get().submitAnswer('(Waktu Habis)');
    }
  },

  resetGame: () => {
    set({
      gamePhase: 'WELCOME',
      currentIndex: 0,
      currentQuestion: null,
      score: 0,
      streak: 0,
      maxStreak: 0,
      hintsRevealed: 0,
      aiClue: null,
      isFetchingClue: false,
      clueError: null,
      selectedOption: null,
      textAnswerInput: '',
      roundResults: [],
      lastRoundResult: null,
      gameSummary: null,
    });
  },
}));
