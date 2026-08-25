import { describe, it, expect } from 'vitest';
import { SendChatMessageSchema } from '@/lib/validators/chat';

describe('AI Call Request Payload & Schema Validation', () => {
  it('validates standard AICallModal voice payload against SendChatMessageSchema', () => {
    const payload = {
      message: 'Berapa turunan dari x^2 + 5x?',
      mode: 'socratic',
      context: {
        tutorMode: 'socratic',
        gradeLevel: 'SENIOR_HIGH',
        locale: 'id',
      },
    };

    const parsed = SendChatMessageSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.message).toBe('Berapa turunan dari x^2 + 5x?');
      expect(parsed.data.mode).toBe('socratic');
      expect(parsed.data.context?.gradeLevel).toBe('SENIOR_HIGH');
      expect(parsed.data.context?.locale).toBe('id');
    }
  });

  it('validates English and Sundanese payloads', () => {
    const enPayload = {
      message: 'Explain Newton second law of motion',
      mode: 'step_breakdown',
      context: {
        tutorMode: 'step_breakdown',
        gradeLevel: 'JUNIOR_HIGH',
        locale: 'en',
      },
    };

    const enParsed = SendChatMessageSchema.safeParse(enPayload);
    expect(enParsed.success).toBe(true);

    const suPayload = {
      message: 'Kumaha cara ngitung luas segitiga?',
      mode: 'olympiad',
      context: {
        tutorMode: 'olympiad',
        gradeLevel: 'PRIMARY',
        locale: 'su',
      },
    };

    const suParsed = SendChatMessageSchema.safeParse(suPayload);
    expect(suParsed.success).toBe(true);
  });
});
