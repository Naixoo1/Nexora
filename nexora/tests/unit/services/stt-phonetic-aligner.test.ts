import { describe, it, expect } from 'vitest';
import { normalizePhoneticQuery } from '@/services/stt-phonetic-aligner';

describe('Acoustic Phonetic Aligner & Normalizer', () => {
  describe('English Phonetic Normalization', () => {
    it('normalizes "route of" and spoken numbers to standard root expressions', () => {
      expect(normalizePhoneticQuery('what is route of one twenty one')).toBe('what is root of 121');
      expect(normalizePhoneticQuery('square route of one forty four')).toBe('square root of 144');
      expect(normalizePhoneticQuery('cube route of twenty seven')).toBe('cube root of twenty seven');
    });

    it('normalizes calculus homophone "deviation" to "derivation"', () => {
      expect(normalizePhoneticQuery('find the deviation of x squared')).toBe('find the derivation of x squared');
      expect(normalizePhoneticQuery('deviation of sin x')).toBe('derivation of sin x');
    });

    it('normalizes trigonometry homophones "sign of x" to "sin of x"', () => {
      expect(normalizePhoneticQuery('what is sign of x as x approaches zero')).toBe('what is sin of x as x approaches zero');
      expect(normalizePhoneticQuery('co sign of theta')).toBe('cosine of theta');
    });

    it('normalizes linear algebra homophones "metrics" and "victor"', () => {
      expect(normalizePhoneticQuery('determinant of metrics')).toBe('determinant of matrix');
      expect(normalizePhoneticQuery('victor addition')).toBe('vector addition');
    });
  });

  describe('Indonesian & Sundanese Phonetic Normalization', () => {
    it('normalizes spelling clipping in Indonesian mathematical queries', () => {
      expect(normalizePhoneticQuery('explain deret geometri dan chontohnya')).toBe('explain deret geometri dan contohnya');
      expect(normalizePhoneticQuery('turonan fungsi aljabar')).toBe('turunan fungsi aljabar');
      expect(normalizePhoneticQuery('persaman kuadrat')).toBe('persamaan kuadrat');
      expect(normalizePhoneticQuery('rumus barisan aritmatika')).toBe('rumus barisan aritmetika');
    });

    it('normalizes acoustic variations in math terms', () => {
      expect(normalizePhoneticQuery('kalkuluse dan integral')).toBe('kalkulus dan integral');
      expect(normalizePhoneticQuery('akarr pangkat tiga')).toBe('akar pangkat tiga');
      expect(normalizePhoneticQuery('fektor satuan')).toBe('vektor satuan');
    });
  });
});
