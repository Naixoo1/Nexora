import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OnboardingModal, ONBOARDING_STORAGE_KEY } from '@/components/onboarding/OnboardingModal';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null, isPending: false })),
    signIn: { social: vi.fn() },
    signOut: vi.fn(),
  },
}));

describe('OnboardingModal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders automatically when user has not completed onboarding', () => {
    render(<OnboardingModal />);

    expect(screen.getByText('Student Orientation')).toBeDefined();
    expect(screen.getByText('What is your primary academic focus?')).toBeDefined();
    expect(screen.getByText('Olympiad Math & Calculus')).toBeDefined();
  });

  it('does not render if onboarding was already completed in localStorage', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    render(<OnboardingModal />);

    expect(screen.queryByText('Student Orientation')).toBeNull();
  });

  it('navigates through all 4 steps and saves completion to localStorage on completion', () => {
    render(<OnboardingModal />);

    // Step 1 -> Select Track and Continue
    expect(screen.getByText('Step 1 of 4')).toBeDefined();
    const csOption = screen.getByText('Computer Science');
    fireEvent.click(csOption);

    const continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    // Step 2 -> Logic Tree & KaTeX
    expect(screen.getByText('Step 2 of 4')).toBeDefined();
    expect(screen.getByText('Feature 1: STEM Logic Canvas')).toBeDefined();
    fireEvent.click(screen.getByText('Continue'));

    // Step 3 -> One-Click Task Bridge
    expect(screen.getByText('Step 3 of 4')).toBeDefined();
    expect(screen.getByText('Feature 2: Canvas-to-Task Bridge')).toBeDefined();
    fireEvent.click(screen.getByText('Continue'));

    // Step 4 -> Context-Aware AI Copilot
    expect(screen.getByText('Step 4 of 4')).toBeDefined();
    expect(screen.getByText('Feature 3: Context-Aware AI Copilot')).toBeDefined();

    // Click "Get Started"
    const getStartedBtn = screen.getByText('Get Started');
    fireEvent.click(getStartedBtn);

    // Modal should close and record to localStorage
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('true');
    expect(localStorage.getItem('nexora_preferred_track')).toBe('cs');
    expect(screen.queryByText('Student Orientation')).toBeNull();
  });

  it('skips tutorial when Skip Tutorial button is clicked', () => {
    render(<OnboardingModal />);

    const skipBtn = screen.getByText('Skip Tutorial');
    fireEvent.click(skipBtn);

    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('true');
    expect(screen.queryByText('Student Orientation')).toBeNull();
  });

  it('re-opens when custom event nexora:restart-onboarding is fired', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    render(<OnboardingModal />);

    expect(screen.queryByText('Student Orientation')).toBeNull();

    act(() => {
      window.dispatchEvent(new CustomEvent('nexora:restart-onboarding'));
    });

    expect(screen.getByText('Student Orientation')).toBeDefined();
  });
});
