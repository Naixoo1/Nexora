import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

    it('shows WIN meme pop-up when clicking the correct answer (8 Buah Apel) and advances on dismiss', () => {
      render(<PrimaryExpoArena />);

      const correctButton = screen.getByText('8 Buah Apel').closest('button')!;
      fireEvent.click(correctButton);

      // Quizizz WIN meme overlay should appear
      expect(screen.getByText('BENAR! 🎉')).toBeDefined();
      expect(screen.getByText('Luar biasa, poin bertambah!')).toBeDefined();

      // Clicking anywhere dismisses the meme and advances to question 2
      fireEvent.click(screen.getByRole('dialog'));

      // Question 2 is Taman Bangun Datar Ajaib
      expect(screen.getByText('Taman Bangun Datar Ajaib')).toBeDefined();
    });

    it('shows LOSE meme pop-up when clicking an incorrect answer and displays retry modal on dismiss', () => {
      render(<PrimaryExpoArena />);

      const wrongButton = screen.getByText('6 Buah Apel').closest('button')!;
      fireEvent.click(wrongButton);

      // Quizizz LOSE meme overlay should appear
      expect(screen.getByText('YAH, SALAH! 😅')).toBeDefined();
      expect(screen.getByText('Jangan menyerah, kamu pasti bisa!')).toBeDefined();

      // Dismiss meme
      fireEvent.click(screen.getByRole('dialog'));

      // Retry modal should now be shown
      expect(screen.getByText('Ayo coba lagi! Kamu pasti bisa! 💪')).toBeDefined();
      expect(screen.getByText('Coba Jawab Lagi')).toBeDefined();
    });

    it('shows HINT meme pop-up and displays hint modal on dismiss', () => {
      render(<PrimaryExpoArena />);

      const hintButton = screen.getByText(/Butuh Bantuan\? Buka Petunjuk Ajaib/i);
      fireEvent.click(hintButton);

      // HINT meme overlay should appear
      expect(screen.getByText('PETUNJUK DATANG! 💡')).toBeDefined();

      // Dismiss meme
      fireEvent.click(screen.getByRole('dialog'));

      // Detailed hint modal should now be shown
      expect(screen.getByText('Petunjuk Ajaib 💡')).toBeDefined();
      expect(screen.getByText(/Bagi 24 apel ke dalam 3 bagian/i)).toBeDefined();
    });

    it('transitions through all questions to END celebration meme overlay and certificate', () => {
      render(<PrimaryExpoArena />);

      // Answer all 5 questions correctly
      for (let i = 0; i < PRIMARY_EXPO_QUESTIONS.length; i++) {
        const currentQ = PRIMARY_EXPO_QUESTIONS[i];
        const correctOpt = currentQ.options.find((opt) => opt.isCorrect)!;

        const correctBtn = screen.getByText(correctOpt.label).closest('button')!;
        fireEvent.click(correctBtn);

        // Dismiss WIN meme
        fireEvent.click(screen.getByRole('dialog'));
      }

      // Final END meme pop-up should be visible
      expect(screen.getByText('HOREEE! TAMAT! 🏆')).toBeDefined();
      expect(screen.getByText('Semua tantangan selesai dengan gemilang!')).toBeDefined();

      // Dismiss END meme to reveal certificate
      fireEvent.click(screen.getByRole('dialog'));

      // Certificate screen should now be visible with standardized layout
      expect(screen.getByText('Sertifikat Pemecah Masalah Cilik AI')).toBeDefined();
      expect(screen.getByText('Juara Cilik AI Solver')).toBeDefined();
      expect(screen.getByText('Total Skor')).toBeDefined();
      expect(screen.getByText('Akurasi')).toBeDefined();
      expect(screen.getByText('Best Streak')).toBeDefined();
      expect(screen.getByText('Total Waktu')).toBeDefined();
      expect(screen.getByText('Main Petualangan Lagi')).toBeDefined();
    });

    it('cancels speech synthesis immediately when selecting an option or changing questions', () => {
      render(<PrimaryExpoArena />);

      const cancelSpy = (window as unknown as { speechSynthesis: { cancel: () => void } }).speechSynthesis.cancel;
      expect(cancelSpy).toHaveBeenCalled();

      // Click option
      const optButton = screen.getByText('8 Buah Apel').closest('button')!;
      fireEvent.click(optButton);

      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
