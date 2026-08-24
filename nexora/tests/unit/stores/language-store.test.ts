import { describe, it, expect, beforeEach } from 'vitest';
import { useLanguageStore, LANGUAGE_OPTIONS } from '@/stores/useLanguageStore';
import { buildSystemPrompt } from '@/services/chat-prompt';

describe('Global Language Store & AI Prompt Locale Integration', () => {
  beforeEach(() => {
    useLanguageStore.setState({ locale: 'id' });
    if (typeof document !== 'undefined') {
      document.documentElement.lang = 'id';
    }
  });

  describe('useLanguageStore', () => {
    it('initializes with default locale "id"', () => {
      const state = useLanguageStore.getState();
      expect(state.locale).toBe('id');
    });

    it('updates locale to "en" and synchronizes document.documentElement.lang', () => {
      useLanguageStore.getState().setLocale('en');
      expect(useLanguageStore.getState().locale).toBe('en');
      expect(document.documentElement.lang).toBe('en');
    });

    it('updates locale to "su" (Basa Sunda) correctly', () => {
      useLanguageStore.getState().setLocale('su');
      expect(useLanguageStore.getState().locale).toBe('su');
      expect(document.documentElement.lang).toBe('su');
    });

    it('contains all 3 supported language options with flags and labels', () => {
      expect(LANGUAGE_OPTIONS).toHaveLength(3);
      expect(LANGUAGE_OPTIONS.map((opt) => opt.code)).toEqual(['id', 'en', 'su']);
      expect(LANGUAGE_OPTIONS.map((opt) => opt.shortCode)).toEqual(['ID', 'EN', 'SU']);
      expect(LANGUAGE_OPTIONS.map((opt) => opt.flag)).toEqual(['🇮🇩', '🇬🇧', '🇮🇩']);
    });
  });

  describe('buildSystemPrompt Locale Calibration', () => {
    it('injects English language instructions when locale is "en"', () => {
      const prompt = buildSystemPrompt({
        tutorMode: 'socratic',
        locale: 'en',
      });

      expect(prompt).toContain('TARGET RESPONSE LANGUAGE: ENGLISH (UK/US)');
      expect(prompt).toContain('Respond entirely in natural, articulate, and grammatically precise English');
      expect(prompt).toContain('$inline$ and $$display$$');
    });

    it('injects Basa Sunda instructions when locale is "su"', () => {
      const prompt = buildSystemPrompt({
        tutorMode: 'step_breakdown',
        locale: 'su',
      });

      expect(prompt).toContain('TARGET RESPONSE LANGUAGE: BASA SUNDA (SUNDANESE)');
      expect(prompt).toContain('Basa Sunda (Loma/Lemes yang komunikatif dan ramah)');
      expect(prompt).toContain('KaTeX LaTeX standar');
    });

    it('defaults to Bahasa Indonesia when locale is "id" or omitted', () => {
      const defaultPrompt = buildSystemPrompt({
        tutorMode: 'general',
      });
      expect(defaultPrompt).toContain('TARGET RESPONSE LANGUAGE: BAHASA INDONESIA');

      const idPrompt = buildSystemPrompt({
        tutorMode: 'general',
        locale: 'id',
      });
      expect(idPrompt).toContain('TARGET RESPONSE LANGUAGE: BAHASA INDONESIA');
    });
  });
});
