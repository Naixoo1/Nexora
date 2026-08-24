import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppLocale = 'id' | 'en' | 'su';

export interface LanguageOption {
  code: AppLocale;
  label: string;
  nativeLabel: string;
  flag: string;
  shortCode: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'id',
    label: 'Bahasa Indonesia',
    nativeLabel: 'Bahasa Indonesia',
    flag: '🇮🇩',
    shortCode: 'ID',
  },
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    flag: '🇬🇧',
    shortCode: 'EN',
  },
  {
    code: 'su',
    label: 'Basa Sunda',
    nativeLabel: 'Basa Sunda',
    flag: '🇮🇩',
    shortCode: 'SU',
  },
];

export interface LanguageStoreState {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

export const useLanguageStore = create<LanguageStoreState>()(
  persist(
    (set) => ({
      locale: 'id',
      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== 'undefined') {
          document.documentElement.lang = locale;
        }
      },
    }),
    {
      name: 'nexora_locale',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.locale && typeof document !== 'undefined') {
          document.documentElement.lang = state.locale;
        }
      },
    }
  )
);
