import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import {
  ExpoReactionOverlay,
  type ExpoReactionType,
} from '@/components/expo/ExpoReactionOverlay';

describe('ExpoReactionOverlay Component (Quizizz-Style Meme Pop-Up)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('auto-dismisses after default 2200ms duration', () => {
    const handleDismiss = vi.fn();
    render(<ExpoReactionOverlay type="win" onDismiss={handleDismiss} />);

    expect(handleDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses immediately on user tap/click before timer expires', () => {
    const handleDismiss = vi.fn();
    render(<ExpoReactionOverlay type="win" onDismiss={handleDismiss} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
