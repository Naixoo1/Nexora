'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguageStore, type AppLocale } from '@/stores/useLanguageStore';

const NUMBER_WORDS_ID: Record<string, string> = {
  '0': 'nol',
  '1': 'satu',
  '2': 'dua',
  '3': 'tiga',
  '4': 'empat',
  '5': 'lima',
  '6': 'enam',
  '7': 'tujuh',
  '8': 'delapan',
  '9': 'sembilan',
  '10': 'sepuluh',
};

const NUMBER_WORDS_EN: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
};

const NUMBER_WORDS_SU: Record<string, string> = {
  '0': 'nol',
  '1': 'hiji',
  '2': 'dua',
  '3': 'talu',
  '4': 'opat',
  '5': 'lima',
  '6': 'genep',
  '7': 'tujuh',
  '8': 'dalapan',
  '9': 'salapan',
  '10': 'sapuluh',
};

/**
 * Preprocesses text containing Markdown and LaTeX mathematical formulas into
 * clean, natural phonetically-spoken text for Web Speech Synthesis.
 */
export function cleanTextForSpeech(text: string, locale: string = 'id'): string {
  if (!text || typeof text !== 'string') return '';

  const isEn = locale.startsWith('en');
  const isSu = locale.startsWith('su');

  const numMap = isEn ? NUMBER_WORDS_EN : isSu ? NUMBER_WORDS_SU : NUMBER_WORDS_ID;

  let cleaned = text;

  // 1. Remove raw JSON, node creation blocks, code fences
  cleaned = cleaned.replace(/```(?:nexora-node|node|json|typescript|javascript|python)?[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 2. Remove HTML/XML tags (like <think>...</think>, <br/>, <span>)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // 3. Function to transform a LaTeX math snippet into spoken natural language
  const transformLatexSnippet = (latex: string): string => {
    let s = latex.trim();

    // Clean formatting brackets
    s = s.replace(/\\left[\[\(\{]/g, '(').replace(/\\right[\]\)\}]/g, ')');
    s = s.replace(/\\text\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
    s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');

    // Fractions: \frac{a}{b} -> "a per b" (ID/SU) or "a over b" (EN)
    const perWord = isEn ? ' over ' : ' per ';
    while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
      s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_match, num, den) => {
        return `(${num.trim()}${perWord}${den.trim()})`;
      });
    }

    // Roots: \sqrt[n]{x} -> "akar pangkat n dari x" / "n-th root of x"
    if (isEn) {
      s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1-th root of $2');
      s = s.replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1');
      s = s.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, 'square root of $1');
    } else {
      s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'akar pangkat $1 dari $2');
      s = s.replace(/\\sqrt\{([^}]+)\}/g, 'akar $1');
      s = s.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, 'akar $1');
    }

    // Powers / Exponents
    // x^2 -> "x kuadrat" (ID/SU) or "x squared" (EN)
    if (isEn) {
      s = s.replace(/([a-zA-Z0-9_\(\)]+)\^\{?2\}?/g, '$1 squared');
      s = s.replace(/([a-zA-Z0-9_\(\)]+)\^\{?3\}?/g, '$1 cubed');
      s = s.replace(/([a-zA-Z0-9_\(\)]+)\^\{?([a-zA-Z0-9_\-\+]+)\}?/g, '$1 to the power of $2');
    } else {
      s = s.replace(/([a-zA-Z0-9_\(\)]+)\^\{?2\}?/g, '$1 kuadrat');
      s = s.replace(/([a-zA-Z0-9_\(\)]+)\^\{?3\}?/g, '$1 pangkat 3');
      s = s.replace(/([a-zA-Z0-9_\(\)]+)\^\{?([a-zA-Z0-9_\-\+]+)\}?/g, '$1 pangkat $2');
    }

    // Subscripts: a_1 -> "a satu", S_n -> "S n", S_{10} -> "S sepuluh"
    s = s.replace(/([a-zA-Z]+)_\{?([0-9]+)\}?/g, (_match, v, numStr) => {
      const spelled = numMap[numStr] || numStr;
      return `${v} ${spelled}`;
    });
    s = s.replace(/([a-zA-Z]+)_\{?([a-zA-Z0-9]+)\}?/g, '$1 $2');

    // Summations & Integrals
    if (isEn) {
      s = s.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, 'sum from $1 to $2 of ');
      s = s.replace(/\\sum/g, 'sum of ');
      s = s.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, 'integral from $1 to $2 of ');
      s = s.replace(/\\int/g, 'integral of ');
      s = s.replace(/\\lim_\{([^}]+)\}/g, 'limit as $1 of ');
    } else {
      s = s.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, 'jumlah dari $1 sampai $2 ');
      s = s.replace(/\\sum/g, 'jumlah ');
      s = s.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, 'integral dari $1 sampai $2 ');
      s = s.replace(/\\int/g, 'integral ');
      s = s.replace(/\\lim_\{([^}]+)\}/g, 'limit saat $1 ');
    }

    // Operators & Symbols
    if (isEn) {
      s = s.replace(/\\cdot|\\times|\\ast/g, ' times ');
      s = s.replace(/\\div/g, ' divided by ');
      s = s.replace(/\\pm/g, ' plus or minus ');
      s = s.replace(/\\leq|\\le/g, ' less than or equal to ');
      s = s.replace(/\\geq|\\ge/g, ' greater than or equal to ');
      s = s.replace(/\\neq|\\ne/g, ' is not equal to ');
      s = s.replace(/\\approx/g, ' approximately equals ');
      s = s.replace(/\\equiv/g, ' is equivalent to ');
      s = s.replace(/\\to|\\rightarrow/g, ' approaches ');
      s = s.replace(/\\infty/g, ' infinity ');
      s = s.replace(/=/g, ' equals ');
      s = s.replace(/\+/g, ' plus ');
      s = s.replace(/(?<=\s)-(?=\s|[a-zA-Z0-9])/g, ' minus ');
    } else if (isSu) {
      s = s.replace(/\\cdot|\\times|\\ast/g, ' kali ');
      s = s.replace(/\\div/g, ' bagi ');
      s = s.replace(/\\pm/g, ' plus minus ');
      s = s.replace(/\\leq|\\le/g, ' kirang ti atanapi sami sareng ');
      s = s.replace(/\\geq|\\ge/g, ' langkung ti atanapi sami sareng ');
      s = s.replace(/\\neq|\\ne/g, ' teu sami sareng ');
      s = s.replace(/\\approx/g, ' caket kana ');
      s = s.replace(/\\equiv/g, ' sami sareng ');
      s = s.replace(/\\to|\\rightarrow/g, ' nuju ');
      s = s.replace(/\\infty/g, ' teu aya watesna ');
      s = s.replace(/=/g, ' sami sareng ');
      s = s.replace(/\+/g, ' nambih ');
      s = s.replace(/(?<=\s)-(?=\s|[a-zA-Z0-9])/g, ' ngirangan ');
    } else {
      s = s.replace(/\\cdot|\\times|\\ast/g, ' kali ');
      s = s.replace(/\\div/g, ' bagi ');
      s = s.replace(/\\pm/g, ' plus minus ');
      s = s.replace(/\\leq|\\le/g, ' kurang dari atau sama dengan ');
      s = s.replace(/\\geq|\\ge/g, ' lebih dari atau sama dengan ');
      s = s.replace(/\\neq|\\ne/g, ' tidak sama dengan ');
      s = s.replace(/\\approx/g, ' mendekati ');
      s = s.replace(/\\equiv/g, ' ekuivalen dengan ');
      s = s.replace(/\\to|\\rightarrow/g, ' menuju ');
      s = s.replace(/\\infty/g, ' tak hingga ');
      s = s.replace(/=/g, ' sama dengan ');
      s = s.replace(/\+/g, ' tambah ');
      s = s.replace(/(?<=\s)-(?=\s|[a-zA-Z0-9])/g, ' kurang ');
    }

    // Greek letters
    s = s.replace(/\\alpha/g, isEn ? 'alpha' : 'alfa');
    s = s.replace(/\\beta/g, 'beta');
    s = s.replace(/\\gamma/g, 'gamma');
    s = s.replace(/\\delta|\\Delta/g, 'delta');
    s = s.replace(/\\theta/g, isEn ? 'theta' : 'teta');
    s = s.replace(/\\pi/g, 'pi');
    s = s.replace(/\\lambda/g, 'lambda');
    s = s.replace(/\\sigma|\\Sigma/g, 'sigma');
    s = s.replace(/\\omega|\\Omega/g, 'omega');
    s = s.replace(/\\mu/g, 'mu');

    // Remove remaining backslashes
    s = s.replace(/\\/g, ' ');

    return s;
  };

  // 4. Replace display math ($$...$$ and \[...\])
  cleaned = cleaned.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    return ` ${transformLatexSnippet(math)} `;
  });
  cleaned = cleaned.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => {
    return ` ${transformLatexSnippet(math)} `;
  });

  // 5. Replace inline math ($...$ and \(...\))
  cleaned = cleaned.replace(/\$([^\$\n]+)\$/g, (_match, math) => {
    return ` ${transformLatexSnippet(math)} `;
  });
  cleaned = cleaned.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
    return ` ${transformLatexSnippet(math)} `;
  });

  // 6. Remove Markdown headings (#, ##), bold (**), italic (*, _), blockquotes (>)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  cleaned = cleaned.replace(/^\s*>\s+/gm, '');
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // markdown links
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, ''); // bullets

  // 7. Clean punctuation and redundant whitespaces
  cleaned = cleaned.replace(/[\(\)\[\]\{\}]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

export interface UseTextToSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const currentLocale = useLanguageStore((state) => state.locale);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeText, setActiveText] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentenceQueueRef = useRef<{ raw: string; spoken: string; locale: string }[]>([]);
  const isSpeakingQueueRef = useRef<boolean>(false);
  const optionsRef = useRef<UseTextToSpeechOptions>(options);
  optionsRef.current = options;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    }
  }, []);

  const processNextInQueue = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (sentenceQueueRef.current.length === 0) {
      isSpeakingQueueRef.current = false;
      setIsPlaying(false);
      setActiveText(null);
      optionsRef.current.onEnd?.();
      return;
    }

    isSpeakingQueueRef.current = true;
    const item = sentenceQueueRef.current.shift();
    if (!item || !item.spoken.trim()) {
      processNextInQueue();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(item.spoken);
    utteranceRef.current = utterance;

    const targetLocale = item.locale;
    const voices = window.speechSynthesis.getVoices();
    let matchedVoice: SpeechSynthesisVoice | undefined;

    if (targetLocale.startsWith('en')) {
      matchedVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.lang.includes('US') || v.name.includes('Natural') || v.name.includes('Google'))
        ) || voices.find((v) => v.lang.startsWith('en'));
      utterance.lang = 'en-US';
    } else if (targetLocale.startsWith('su')) {
      matchedVoice =
        voices.find((v) => v.lang.startsWith('su')) ||
        voices.find((v) => v.lang.startsWith('id'));
      utterance.lang = matchedVoice?.lang || 'id-ID';
    } else {
      matchedVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('id') &&
            (v.name.includes('Indonesian') || v.name.includes('Google'))
        ) || voices.find((v) => v.lang.startsWith('id'));
      utterance.lang = 'id-ID';
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = optionsRef.current.rate ?? 1.0;
    utterance.pitch = optionsRef.current.pitch ?? 1.0;
    utterance.volume = optionsRef.current.volume ?? 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setActiveText(item.raw);
    };

    utterance.onend = () => {
      processNextInQueue();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        optionsRef.current.onError?.(e);
      }
      processNextInQueue();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      sentenceQueueRef.current = [];
      isSpeakingQueueRef.current = false;
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setActiveText(null);
    }
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPlaying]);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const queueSentence = useCallback(
    (sentence: string, overrideLocale?: AppLocale | string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      if (!sentence || !sentence.trim()) return;

      const targetLocale = (overrideLocale || currentLocale || 'id') as string;
      const spokenText = cleanTextForSpeech(sentence, targetLocale);
      if (!spokenText.trim()) return;

      sentenceQueueRef.current.push({
        raw: sentence,
        spoken: spokenText,
        locale: targetLocale,
      });

      if (!isSpeakingQueueRef.current) {
        processNextInQueue();
      }
    },
    [currentLocale, processNextInQueue]
  );

  const speak = useCallback(
    (text: string, overrideLocale?: AppLocale | string) => {
      stop();
      queueSentence(text, overrideLocale);
    },
    [stop, queueSentence]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        sentenceQueueRef.current = [];
        isSpeakingQueueRef.current = false;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isPlaying,
    isPaused,
    isSupported,
    activeText,
    speak,
    queueSentence,
    stop,
    pause,
    resume,
  };
}
