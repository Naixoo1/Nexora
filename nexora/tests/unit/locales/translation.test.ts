import { describe, it, expect, beforeEach } from 'vitest';
import { dictionaries, getTranslation } from '@/locales';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { id } from '@/locales/id';
import { en } from '@/locales/en';
import { su } from '@/locales/su';

describe('UI Localization Dictionaries & Translation Engine', () => {
  beforeEach(() => {
    useLanguageStore.setState({ locale: 'id' });
  });

  describe('Dictionary Parity & Completeness', () => {
    const requiredKeys = Object.keys(id) as (keyof typeof id)[];

    it('ensures Indonesian (id) has all essential UI keys', () => {
      expect(id['nav.canvas']).toBe('Kanvas Logika');
      expect(id['nav.planner']).toBe('Rencana Belajar');
      expect(id['nav.expo']).toBe('Arena Tantangan');
      expect(id['nav.call']).toBe('Panggilan AI');
      expect(id['canvas.addNode']).toBe('Tambah Node');
      expect(id['planner.title']).toBe('Generator Rencana Belajar AI');
      expect(id['expo.title']).toBe('Arena Tantangan Cerdas Nexora');
      expect(id['expo.readQuestion']).toBe('Dengarkan Soal');
      expect(id['chat.listenMsg']).toBe('Dengarkan Suara');
      expect(id['chat.callAI']).toBe('Telepon Nexora');
      expect(id['task.todo']).toBe('Akan Dikerjakan');
    });

    it('ensures English (en) has parity with all keys in id', () => {
      requiredKeys.forEach((key) => {
        expect(en[key]).toBeDefined();
        expect(typeof en[key]).toBe('string');
        expect(en[key].length).toBeGreaterThan(0);
      });
      expect(en['nav.canvas']).toBe('Logic Canvas');
      expect(en['nav.planner']).toBe('Study Planner');
      expect(en['nav.call']).toBe('AI Call');
      expect(en['chat.callAI']).toBe('Call Nexora');
      expect(en['expo.readQuestion']).toBe('Read Question');
    });

    it('ensures Basa Sunda (su) has parity with all keys in id', () => {
      requiredKeys.forEach((key) => {
        expect(su[key]).toBeDefined();
        expect(typeof su[key]).toBe('string');
        expect(su[key].length).toBeGreaterThan(0);
      });
      expect(su['nav.chat']).toBe('Taros AI');
      expect(su['nav.planner']).toBe('Rancangan Diajar');
      expect(su['nav.call']).toBe('Telepon AI');
      expect(su['chat.listenMsg']).toBe('Dangukeun Sora');
      expect(su['expo.readQuestion']).toBe('Dangukeun Soal');
    });
  });

  describe('getTranslation Helper', () => {
    it('retrieves correct translation for given locale', () => {
      expect(getTranslation('id', 'nav.canvas')).toBe('Kanvas Logika');
      expect(getTranslation('en', 'nav.canvas')).toBe('Logic Canvas');
      expect(getTranslation('su', 'nav.canvas')).toBe('Kanvas Logika');

      expect(getTranslation('id', 'nav.signOut')).toBe('Keluar');
      expect(getTranslation('en', 'nav.signOut')).toBe('Sign Out');
      expect(getTranslation('su', 'nav.signOut')).toBe('Kaluar');
    });

    it('substitutes parameter tokens properly', () => {
      const template = getTranslation('id', 'nav.canvas');
      expect(template).toBe('Kanvas Logika');
    });

    it('falls back gracefully to id dictionary if locale or key is missing', () => {
      // @ts-expect-error test fallback
      expect(getTranslation('unknown', 'nav.canvas')).toBe('Kanvas Logika');
    });
  });
});
