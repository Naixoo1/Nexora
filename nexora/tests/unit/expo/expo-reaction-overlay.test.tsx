import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import {
  ExpoReactionOverlay,
  type ExpoReactionType,
} from '@/components/expo/ExpoReactionOverlay';
import { useLanguageStore } from '@/stores/useLanguageStore';

describe('ExpoReactionOverlay Component (Quizizz-Style Meme Pop-Up & Calibrated Voiceover)', () => {
  let mockSpeak: ReturnType<typeof vi.fn>;
  let mockCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    useLanguageStore.setState({ locale: 'id' });

    mockSpeak = vi.fn();
    mockCancel = vi.fn();

    (window as unknown as Record<string, unknown>).speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: vi.fn(() => []),
      pause: vi.fn(),
      resume: vi.fn(),
    };

    (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = function (text: string) {
      return { text, lang: 'id-ID' };
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
  });

  it('renders WIN meme reaction with correct title, subtitle, and gif asset', () => {
    const handleDismiss = vi.fn();
    render(<ExpoReactionOverlay type="win" onDismiss={handleDismiss} />);

    expect(screen.getByText('BENAR! 🎉')).toBeDefined();
    expect(screen.getByText('Luar biasa, poin bertambah!')).toBeDefined();

    const img = screen.getByAltText('win') as HTMLImageElement;
    expect(img.src).toContain('/media/reactions/win.gif');
  });

  it('renders LOSE meme reaction with correct title, subtitle, and gif asset', () => {
    const handleDismiss = vi.fn();
    render(<ExpoReactionOverlay type="lose" onDismiss={handleDismiss} />);

    expect(screen.getByText('YAH, SALAH! 😅')).toBeDefined();
    expect(screen.getByText('Jangan menyerah, kamu pasti bisa!')).toBeDefined();

    const img = screen.getByAltText('lose') as HTMLImageElement;
    expect(img.src).toContain('/media/reactions/lose.gif');
  });

  it('renders HINT meme reaction with correct title and gif asset', () => {
    const handleDismiss = vi.fn();
    render(<ExpoReactionOverlay type="hint" onDismiss={handleDismiss} />);

    expect(screen.getByText('PETUNJUK DATANG! 💡')).toBeDefined();
    expect(screen.getByText('Petunjuk ajaib membantumu berpikir!')).toBeDefined();

    const img = screen.getByAltText('hint') as HTMLImageElement;
    expect(img.src).toContain('/media/reactions/hint.gif');
  });

  it('renders END session celebration meme reaction with correct title and gif asset', () => {
    const handleDismiss = vi.fn();
    render(<ExpoReactionOverlay type="end" onDismiss={handleDismiss} />);

    expect(screen.getByText('HOREEE! TAMAT! 🏆')).toBeDefined();
    expect(screen.getByText('Semua tantangan selesai dengan gemilang!')).toBeDefined();

    const img = screen.getByAltText('end') as HTMLImageElement;
    expect(img.src).toContain('/media/reactions/end.gif');
  });

  it('auto-dismisses after default 2200ms duration and cancels speech', () => {
    const handleDismiss = vi.fn();
    render(<ExpoReactionOverlay type="win" onDismiss={handleDismiss} />);

    expect(handleDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(handleDismiss).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalled();
  });

  it('dismisses immediately on user tap/click before timer expires and cancels speech', () => {
    const handleDismiss = vi.fn();
    render(<ExpoReactionOverlay type="win" onDismiss={handleDismiss} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalled();
  });

  describe('Calibrated Reaction Voiceover Audio Across Tiers', () => {
    it('triggers JHS/SHS WIN voiceover in Indonesian on mount', () => {
      render(<ExpoReactionOverlay type="win" onDismiss={vi.fn()} gradeLevel="JUNIOR_HIGH" />);

      expect(mockCancel).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Luar biasa, jawabanmu tepat!' })
      );
    });

    it('triggers JHS/SHS LOSE voiceover in Indonesian on mount', () => {
      render(<ExpoReactionOverlay type="lose" onDismiss={vi.fn()} gradeLevel="SENIOR_HIGH" />);

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Ayo coba lagi, periksa kembali langkah penalaranmu!' })
      );
    });

    it('triggers JHS/SHS HINT voiceover in Indonesian on mount', () => {
      render(<ExpoReactionOverlay type="hint" onDismiss={vi.fn()} gradeLevel="JUNIOR_HIGH" />);

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Perhatikan petunjuk berikut untuk membantumu berpikir.' })
      );
    });

    it('triggers JHS/SHS END celebration voiceover in Indonesian on mount', () => {
      render(<ExpoReactionOverlay type="end" onDismiss={vi.fn()} gradeLevel="SENIOR_HIGH" />);

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Selamat! Kamu telah menyelesaikan seluruh tantangan penalaran AI!' })
      );
    });

    it('triggers English WIN voiceover when active locale is "en"', () => {
      useLanguageStore.setState({ locale: 'en' });
      render(<ExpoReactionOverlay type="win" onDismiss={vi.fn()} gradeLevel="SENIOR_HIGH" />);

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Outstanding, your answer is correct!' })
      );
    });

    it('triggers English LOSE voiceover when active locale is "en"', () => {
      useLanguageStore.setState({ locale: 'en' });
      render(<ExpoReactionOverlay type="lose" onDismiss={vi.fn()} gradeLevel="JUNIOR_HIGH" />);

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({ text: "Let's try again, re-examine your reasoning steps!" })
      );
    });

    it('triggers Primary / SD specific voiceovers when gradeLevel is PRIMARY', () => {
      render(<ExpoReactionOverlay type="win" onDismiss={vi.fn()} gradeLevel="PRIMARY" />);

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Hebat! Jawaban kamu benar sekali!' })
      );
    });

    it('does not speak voiceover if isMuted is true', () => {
      render(<ExpoReactionOverlay type="win" onDismiss={vi.fn()} isMuted={true} />);

      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });
});
