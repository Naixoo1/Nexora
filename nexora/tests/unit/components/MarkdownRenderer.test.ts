import { describe, it, expect } from 'vitest';
import { cleanMarkdownText } from '@/components/chat/MarkdownRenderer';

describe('MarkdownRenderer Text Cleaner', () => {
  it('should ensure double newline before headers preceded by text without blank line', () => {
    const raw = 'Paragraf pertama\n### Langkah 1: Turunan Pertama\nPenjelasan turunan.';
    const cleaned = cleanMarkdownText(raw);
    expect(cleaned).toBe('Paragraf pertama\n\n### Langkah 1: Turunan Pertama\nPenjelasan turunan.');
  });

  it('should strip redundant bold asterisks wrapping inside headings', () => {
    const raw = '### **Langkah 1: Identifikasi Variabel**';
    const cleaned = cleanMarkdownText(raw);
    expect(cleaned).toBe('### Langkah 1: Identifikasi Variabel');
  });

  it('should strip bold asterisks in h4 with math symbols and colons', () => {
    const raw = '#### **Title ($x$):**';
    const cleaned = cleanMarkdownText(raw);
    expect(cleaned).toBe('#### Title ($x$):');
  });

  it('should normalize multiple headers correctly', () => {
    const raw = `## **1. Konsep Dasar**
Rumus: $f(x) = x^2$
### **2. Penerapan:**
Hasil perhitungan.`;

    const cleaned = cleanMarkdownText(raw);
    expect(cleaned).toContain('## 1. Konsep Dasar');
    expect(cleaned).toContain('### 2. Penerapan:');
  });

  it('should ensure display math blocks have appropriate newlines', () => {
    const raw = 'Persamaan kuadrat:\n$$ax^2 + bx + c = 0$$\nSelesai.';
    const cleaned = cleanMarkdownText(raw);
    expect(cleaned).toBe('Persamaan kuadrat:\n\n$$ax^2 + bx + c = 0$$\nSelesai.');
  });
});
