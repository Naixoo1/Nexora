import { id, type TranslationDictionary, type TranslationKey } from './id';
import { en } from './en';
import { su } from './su';
import type { AppLocale } from '@/stores/useLanguageStore';

export const dictionaries: Record<AppLocale, TranslationDictionary> = {
  id,
  en,
  su,
};

export function getTranslation(
  locale: AppLocale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dict = dictionaries[locale] || dictionaries.id;
  let text: string = dict[key] || dictionaries.id[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
    });
  }

  return text;
}

export type { TranslationDictionary, TranslationKey };
