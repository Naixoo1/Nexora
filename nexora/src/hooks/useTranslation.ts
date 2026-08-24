'use client';

import { useCallback } from 'react';
import { useLanguageStore, type AppLocale } from '@/stores/useLanguageStore';
import { getTranslation, type TranslationKey } from '@/locales';

export function useTranslation() {
  const locale = useLanguageStore((state) => state.locale);
  const setLocale = useLanguageStore((state) => state.setLocale);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return getTranslation(locale, key, params);
    },
    [locale]
  );

  return {
    locale,
    setLocale,
    t,
  };
}
