import type { GradeLevel } from './planner';

export type ExpoGradeTier = GradeLevel; // 'PRIMARY' | 'JUNIOR_HIGH' | 'SENIOR_HIGH'

export type ExpoCategory = 'MATH' | 'GENERAL';

export type ExpoDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ExpoTargetAnswerType = 'MULTIPLE_CHOICE' | 'NUMERIC' | 'SHORT_TEXT';

export interface ExpoQuestion {
  id: string;
  gradeTier: ExpoGradeTier;
  category: ExpoCategory;
  title: string;
  storyScenario: string;
  targetAnswerType: ExpoTargetAnswerType;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[]; // Variations for normalization (e.g., ["15", "15 cm", "lima belas"])
  hints: string[];
  explanation: string;
  difficulty: ExpoDifficulty;
  points: number;
  timeLimitSeconds?: number;
}

export interface ExpoRoundResult {
  questionId: string;
  questionTitle: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  hintsUsedCount: number;
  scoreEarned: number;
}

export interface ExpoGameSummary {
  gradeTier: ExpoGradeTier;
  totalScore: number;
  maxPossibleScore: number;
  correctCount: number;
  totalQuestions: number;
  accuracyPercentage: number;
  totalTimeSpentSeconds: number;
  streakMax: number;
  badgeAwarded: {
    title: string;
    subtitle: string;
    icon: string;
  };
  completedAt: string;
}

export type ExpoGamePhase = 'WELCOME' | 'PLAYING' | 'FEEDBACK' | 'SUMMARY';
