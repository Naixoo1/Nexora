/**
 * Acoustic Phonetic Aligner & Speech-to-Text Normalizer.
 * Maps common phonetic approximations, homophones, acoustic misrecognitions,
 * and accent distortions in English and Indonesian back to standard academic keywords.
 */

interface PhoneticRule {
  pattern: RegExp;
  replacement: string | ((substring: string, ...args: unknown[]) => string);
}

// ── English Academic & Math Phonetic Mappings ──────────────────────────────
const ENGLISH_PHONETIC_RULES: PhoneticRule[] = [
  // "route of / route 121" -> "root of / root 121"
  { pattern: /\broute\s+of\b/gi, replacement: 'root of' },
  { pattern: /\bsquare\s+route\b/gi, replacement: 'square root' },
  { pattern: /\bcube\s+route\b/gi, replacement: 'cube root' },
  { pattern: /\broute\s+(?=\d+|[a-zA-Z]\b)/gi, replacement: 'root ' },

  // "deviation of x" -> "derivation of x" / "derivative of x"
  { pattern: /\b(?:deviation|deviations)\s+of\b/gi, replacement: 'derivation of' },
  { pattern: /\bfind\s+(?:the\s+)?deviation\b/gi, replacement: 'find the derivation' },

  // Trigonometry homophones: "sign of x" / "sign x" -> "sin(x)" or "sin of x"
  { pattern: /\bco\s*sign\b/gi, replacement: 'cosine' },
  { pattern: /\bsign\s+of\s+([a-zA-Z0-9]+|\$[a-zA-Z0-9]+\$)/gi, replacement: 'sin of $1' },
  { pattern: /\btan\s+gent\b/gi, replacement: 'tangent' },

  // Geometry & Matrix homophones
  { pattern: /\bdeterminant\s+of\s+(?:the\s+)?metrics\b/gi, replacement: 'determinant of matrix' },
  { pattern: /\bvictor\b/gi, replacement: 'vector' },
  { pattern: /\bpie\s*(?:r\s*squared|r\^2|\*|\s*r\b)/gi, replacement: 'pi r^2' },

  // Numbers spoken aloud: "one twenty one" -> "121", "one forty four" -> "144", etc.
  { pattern: /\bone\s+twenty\s+one\b/gi, replacement: '121' },
  { pattern: /\bone\s+forty\s+four\b/gi, replacement: '144' },
  { pattern: /\bsixty\s+four\b/gi, replacement: '64' },
  { pattern: /\bone\s+hundred\b/gi, replacement: '100' },
  { pattern: /\btwenty\s+five\b/gi, replacement: '25' },
  { pattern: /\bthirty\s+six\b/gi, replacement: '36' },
  { pattern: /\bforty\s+nine\b/gi, replacement: '49' },
  { pattern: /\beighty\s+one\b/gi, replacement: '81' },
];

// ── Indonesian Academic & Math Phonetic Mappings ───────────────────────────
const INDONESIAN_PHONETIC_RULES: PhoneticRule[] = [
  // Typos / phonetic speech clipping
  { pattern: /\bchontoh(?:nya)?\b/gi, replacement: 'contohnya' },
  { pattern: /\bconto(?:h)?\s+soal\b/gi, replacement: 'contoh soal' },
  { pattern: /\bturonan\b/gi, replacement: 'turunan' },
  { pattern: /\bpersaman\b/gi, replacement: 'persamaan' },
  { pattern: /\bpersamaam\b/gi, replacement: 'persamaan' },
  { pattern: /\bgeometrih\b/gi, replacement: 'geometri' },
  { pattern: /\baritmatika\b/gi, replacement: 'aritmetika' },
  { pattern: /\bdeferensial\b/gi, replacement: 'diferensial' },
  { pattern: /\bfektor\b/gi, replacement: 'vektor' },
  { pattern: /\bakarr\b/gi, replacement: 'akar' },
  { pattern: /\bkalkuluse\b/gi, replacement: 'kalkulus' },
  { pattern: /\bmatrik\b/gi, replacement: 'matriks' },
  { pattern: /\bderet\s+geometri\s+dan\s+chontohnya\b/gi, replacement: 'deret geometri dan contohnya' },
  { pattern: /\bsampurasun\b/gi, replacement: 'sampurasun' },
];

/**
 * Normalizes acoustic and speech-to-text phonetic drift into standardized academic keywords.
 */
export function normalizePhoneticQuery(query: string, locale: string = 'id'): string {
  if (!query || typeof query !== 'string') return '';

  let normalized = query.trim();

  // Apply English rules
  for (const rule of ENGLISH_PHONETIC_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement as string);
  }

  // Apply Indonesian rules
  for (const rule of INDONESIAN_PHONETIC_RULES) {
    normalized = normalized.replace(rule.pattern, rule.replacement as string);
  }

  return normalized.replace(/\s+/g, ' ').trim();
}
