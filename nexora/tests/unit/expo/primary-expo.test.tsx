import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  PRIMARY_EXPO_QUESTIONS,
  type PrimaryQuestionTheme,
} from '@/data/primary-expo-questions';
import { PrimaryExpoArena } from '@/components/expo/PrimaryExpoArena';

describe('Primary School (SD) Gamified Expo Arena', () => {
  describe('Primary Expo Question Bank Integrity', () => {
    it('contains comprehensive set of interactive primary questions', () => {
      expect(PRIMARY_EXPO_QUESTIONS.length).toBeGreaterThanOrEqual(5);
    });

    it('covers all specified themes (counting, geometry, balance, space, animals)', () => {
      const themes = PRIMARY_EXPO_QUESTIONS.map((q) => q.theme);
      const expectedThemes: PrimaryQuestionTheme[] = [
        'counting',
        'geometry',
        'balance',
        'space',
        'animals',
      ];

      for (const theme of expectedThemes) {
        expect(themes).toContain(theme);
      }
    });

    it('ensures each question has 4 structured options with exactly one correct answer', () => {
      for (const q of PRIMARY_EXPO_QUESTIONS) {
        expect(q.id).toBeDefined();
        expect(q.title).toBeTruthy();
        expect(q.storyPrompt.length).toBeGreaterThan(15);
        expect(q.animationAsset).toMatch(/^\/media\/themes\/.+\.svg$/);
        expect(q.options.length).toBe(4);

        const correctOptions = q.options.filter((opt) => opt.isCorrect);
        expect(correctOptions.length).toBe(1);

        for (const opt of q.options) {
          expect(opt.id).toBeTruthy();
          expect(opt.label).toBeTruthy();
          expect(opt.icon).toBeTruthy();
        }

        expect(q.hint.length).toBeGreaterThan(10);
        expect(q.explanation.length).toBeGreaterThan(10);
        expect(q.points).toBeGreaterThan(0);
      }
    });
  });

  describe('PrimaryExpoArena Component Rendering & Interactions', () => {
    beforeEach(() => {
      // Mock window.speechSynthesis for test environment
      (window as unknown as Record<string, unknown>).speechSynthesis = {
        cancel: vi.fn(),
        speak: vi.fn(),
        getVoices: vi.fn(() => []),
        pause: vi.fn(),
        resume: vi.fn(),
      };
      (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = function (text: string) {
        return { text, lang: 'id-ID' };
      };
    });

    it('renders the initial primary question card with 4 chunky options', () => {
      render(<PrimaryExpoArena />);

      // First question is Keranjang Apel Bu Siti
      expect(screen.getByText('Keranjang Apel Bu Siti')).toBeDefined();
      expect(screen.getByText(/Bu Siti memetik 24 buah apel/i)).toBeDefined();

      // Check for 4 options
      expect(screen.getByText('6 Buah Apel')).toBeDefined();
      expect(screen.getByText('7 Buah Apel')).toBeDefined();
      expect(screen.getByText('8 Buah Apel')).toBeDefined();
      expect(screen.getByText('9 Buah Apel')).toBeDefined();
    });

    it('shows WIN overlay when clicking the correct answer (8 Buah Apel)', () => {
      render(<PrimaryExpoArena />);

      const correctButton = screen.getByText('8 Buah Apel').closest('button')!;
      fireEvent.click(correctButton);

      expect(screen.getByText('Hebat! Kamu Benar! 🎉')).toBeDefined();
      expect(screen.getByText('+100 Bintang 🌟')).toBeDefined();
      expect(screen.getByText('Lanjut ke Soal Berikutnya')).toBeDefined();
    });

    it('shows LOSE / Retry overlay when clicking an incorrect answer', () => {
      render(<PrimaryExpoArena />);

      const wrongButton = screen.getByText('6 Buah Apel').closest('button')!;
      fireEvent.click(wrongButton);

      expect(screen.getByText('Ayo coba lagi! Kamu pasti bisa! 💪')).toBeDefined();
      expect(screen.getByText('Coba Lagi Sekarang')).toBeDefined();
    });

    it('opens Hint modal when clicking hint trigger button', () => {
      render(<PrimaryExpoArena />);

      const hintButton = screen.getByText(/Butuh Bantuan\? Buka Petunjuk Ajaib/i);
      fireEvent.click(hintButton);

      expect(screen.getByText('Petunjuk Ajaib 💡')).toBeDefined();
      expect(screen.getByText(/Bagi 24 apel ke dalam 3 bagian/i)).toBeDefined();
    });
  });
});
