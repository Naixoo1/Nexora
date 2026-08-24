import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  EXPO_QUESTIONS_DATABASE,
  getQuestionsByGradeTier,
} from '@/data/expo-questions';
import {
  useExpoGameStore,
  normalizeAnswer,
  evaluateAnswerMatch,
  calculateRoundScore,
} from '@/stores/useExpoGameStore';
import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

describe('Expo Challenge Arena & Question Bank', () => {
  describe('Question Bank Data Integrity', () => {
    it('contains questions for all 3 grade tiers (PRIMARY, JUNIOR_HIGH, SENIOR_HIGH)', () => {
      const primaryQ = getQuestionsByGradeTier('PRIMARY');
      const juniorQ = getQuestionsByGradeTier('JUNIOR_HIGH');
      const seniorQ = getQuestionsByGradeTier('SENIOR_HIGH');

      expect(primaryQ.length).toBeGreaterThanOrEqual(4);
      expect(juniorQ.length).toBeGreaterThanOrEqual(4);
      expect(seniorQ.length).toBeGreaterThanOrEqual(4);
    });

    it('has both MATH and GENERAL categories across the dataset', () => {
      const mathQuestions = EXPO_QUESTIONS_DATABASE.filter((q) => q.category === 'MATH');
      const genQuestions = EXPO_QUESTIONS_DATABASE.filter((q) => q.category === 'GENERAL');

      expect(mathQuestions.length).toBeGreaterThan(genQuestions.length);
      expect(genQuestions.length).toBeGreaterThanOrEqual(3);
    });

    it('ensures each question has mandatory fields populated', () => {
      for (const q of EXPO_QUESTIONS_DATABASE) {
        expect(q.id).toBeDefined();
        expect(q.title).toBeTruthy();
        expect(q.storyScenario.length).toBeGreaterThan(10);
        expect(q.correctAnswer).toBeTruthy();
        expect(q.hints.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(10);
        expect(q.points).toBeGreaterThan(0);
      }
    });
  });

  describe('Answer Normalization & Matching Logic', () => {
    it('normalizes answers by trimming, lowercasing, and stripping punctuation', () => {
      expect(normalizeAnswer('  8 Buah Apel!  ')).toBe('8 buah apel');
      expect(normalizeAnswer('Rp 6.000,-')).toBe('rp 6000');
      expect(normalizeAnswer('1:2.600.000')).toBe('12600000');
    });

    it('matches exact and fuzzy answers against acceptable answers list', () => {
      const isMatch = evaluateAnswerMatch('8 buah apel', '8 buah apel', ['8', '8 buah', 'delapan']);
      expect(isMatch).toBe(true);

      const isFuzzyMatch = evaluateAnswerMatch('8', '8 buah apel', ['8', '8 buah']);
      expect(isFuzzyMatch).toBe(true);

      const isWrong = evaluateAnswerMatch('15 buah', '8 buah apel', ['8', '8 buah']);
      expect(isWrong).toBe(false);
    });

    it('matches case-insensitive general knowledge answers', () => {
      const match1 = evaluateAnswerMatch(
        'kalimantan timur',
        'Kalimantan Timur',
        ['kaltim']
      );
      expect(match1).toBe(true);

      const match2 = evaluateAnswerMatch('kaltim', 'Kalimantan Timur', ['kaltim']);
      expect(match2).toBe(true);
    });
  });

  describe('Score & Streak Calculation', () => {
    it('calculates base points with speed bonus when answered fast', () => {
      // 100 base, 10s spent out of 60s, 0 streak, 0 hints
      const score = calculateRoundScore(100, 10, 60, 0, 0);
      // timeRatio = (1 - 10/60) = 0.833, speedBonus = round(25) = 25
      expect(score).toBeGreaterThanOrEqual(120);
    });

    it('applies 1.25x multiplier for 2-streak and 1.5x for 3+ streak', () => {
      const scoreNoStreak = calculateRoundScore(100, 30, 60, 1, 0);
      const scoreTwoStreak = calculateRoundScore(100, 30, 60, 2, 0);
      const scoreThreeStreak = calculateRoundScore(100, 30, 60, 3, 0);

      expect(scoreTwoStreak).toBeGreaterThan(scoreNoStreak);
      expect(scoreThreeStreak).toBeGreaterThan(scoreTwoStreak);
    });

    it('deducts points when hints are used while maintaining minimum score', () => {
      const scoreNoHints = calculateRoundScore(100, 30, 60, 0, 0);
      const scoreWithHints = calculateRoundScore(100, 30, 60, 0, 2);

      expect(scoreWithHints).toBeLessThan(scoreNoHints);
      expect(scoreWithHints).toBeGreaterThanOrEqual(25);
    });
  });

  describe('useExpoGameStore Lifecycle', () => {
    beforeEach(() => {
      useExpoGameStore.getState().resetGame();
    });

    it('initializes game in WELCOME phase', () => {
      const state = useExpoGameStore.getState();
      expect(state.gamePhase).toBe('WELCOME');
      expect(state.score).toBe(0);
    });

    it('starts game in PLAYING phase with selected grade questions', () => {
      act(() => {
        useExpoGameStore.getState().startGame('PRIMARY');
      });

      const state = useExpoGameStore.getState();
      expect(state.gamePhase).toBe('PLAYING');
      expect(state.selectedGrade).toBe('PRIMARY');
      expect(state.questions.length).toBeGreaterThan(0);
      expect(state.currentQuestion?.gradeTier).toBe('PRIMARY');
    });

    it('submits correct answer, awards points, and transitions to FEEDBACK', () => {
      act(() => {
        useExpoGameStore.getState().startGame('PRIMARY');
      });

      const currentQ = useExpoGameStore.getState().currentQuestion!;

      act(() => {
        useExpoGameStore.getState().submitAnswer(currentQ.correctAnswer);
      });

      const state = useExpoGameStore.getState();
      expect(state.gamePhase).toBe('FEEDBACK');
      expect(state.lastRoundResult?.isCorrect).toBe(true);
      expect(state.score).toBeGreaterThan(0);
      expect(state.streak).toBe(1);
    });

    it('resets streak on incorrect answer', () => {
      act(() => {
        useExpoGameStore.getState().startGame('PRIMARY');
      });

      act(() => {
        useExpoGameStore.getState().submitAnswer('Jawaban Salah 100%');
      });

      const state = useExpoGameStore.getState();
      expect(state.lastRoundResult?.isCorrect).toBe(false);
      expect(state.streak).toBe(0);
      expect(state.lastRoundResult?.scoreEarned).toBe(0);
    });
  });

  describe('useSpeechRecognition Hook', () => {
    it('initializes in idle non-listening state', () => {
      const { result } = renderHook(() => useSpeechRecognition());
      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
    });

    it('handles startListening safely when SpeechRecognition is not present in test runner', () => {
      const { result } = renderHook(() => useSpeechRecognition());
      act(() => {
        result.current.startListening('id-ID');
      });

      expect(result.current.isListening).toBe(false);
    });
  });
});
