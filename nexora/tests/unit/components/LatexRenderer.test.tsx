import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { LatexRenderer } from '@/components/canvas/LatexRenderer';

describe('LatexRenderer Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render valid LaTeX mathematical expression correctly', () => {
    // Arrange
    const latex = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';

    // Act
    const { container } = render(<LatexRenderer latex={latex} displayMode="block" />);

    // Assert
    const katexElement = container.querySelector('.katex-content');
    expect(katexElement).not.toBeNull();
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('should clean and strip double dollar $$ delimiters from raw expressions', () => {
    // Arrange
    const wrappedLatex = '$$E = mc^2$$';

    // Act
    const { container } = render(<LatexRenderer latex={wrappedLatex} />);

    // Assert
    const katexElement = container.querySelector('.katex-content');
    expect(katexElement).not.toBeNull();
    expect(katexElement?.innerHTML).toContain('katex');
  });

  it('should clean single dollar $, bracket \\[ \\], and paren \\( \\) delimiters', () => {
    // Arrange
    const singleDollar = '$F = ma$';
    const bracketDelim = '\\[a^2 + b^2 = c^2\\]';
    const parenDelim = '\\(\\sin^2(x) + \\cos^2(x) = 1\\)';

    // Act
    const render1 = render(<LatexRenderer latex={singleDollar} />);
    const render2 = render(<LatexRenderer latex={bracketDelim} />);
    const render3 = render(<LatexRenderer latex={parenDelim} />);

    // Assert
    expect(render1.container.querySelector('.katex')).not.toBeNull();
    expect(render2.container.querySelector('.katex')).not.toBeNull();
    expect(render3.container.querySelector('.katex')).not.toBeNull();
  });

  it('should return null and render nothing when latex expression is empty or whitespace only', () => {
    // Arrange & Act
    const { container: containerEmpty } = render(<LatexRenderer latex="" />);
    const { container: containerWhitespace } = render(<LatexRenderer latex="   " />);

    // Assert
    expect(containerEmpty.firstChild).toBeNull();
    expect(containerWhitespace.firstChild).toBeNull();
  });

  it('should render inline-block styling when displayMode is inline', () => {
    // Arrange
    const latex = 'x \\in \\mathbb{R}';

    // Act
    const { container } = render(<LatexRenderer latex={latex} displayMode="inline" />);

    // Assert
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain('inline-block');
  });

  it('should render block styling when displayMode is block', () => {
    // Arrange
    const latex = '\\int_0^\\infty e^{-x} dx = 1';

    // Act
    const { container } = render(<LatexRenderer latex={latex} displayMode="block" />);

    // Assert
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain('overflow-x-auto');
  });

  it('should copy clean LaTeX to clipboard and show checkmark icon when copy button is clicked', async () => {
    // Arrange
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const latex = 'R = \\frac{v_0^2 \\sin(2\\theta)}{g}';

    // Act
    const { container } = render(<LatexRenderer latex={latex} showCopyButton={true} />);

    const copyBtn = container.querySelector('button');
    expect(copyBtn).not.toBeNull();

    fireEvent.click(copyBtn!);

    // Assert
    expect(writeTextMock).toHaveBeenCalledWith(latex);

    await waitFor(() => {
      expect(copyBtn?.getAttribute('title')).toBe('Copied LaTeX');
    });
  });

  it('should render custom className when provided in props', () => {
    // Arrange
    const latex = 'v = u + at';
    const customClass = 'custom-stem-formula border-cyan-400';

    // Act
    const { container } = render(<LatexRenderer latex={latex} className={customClass} />);

    // Assert
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain('custom-stem-formula');
    expect(rootDiv.className).toContain('border-cyan-400');
  });

  it('should handle clipboard copy error gracefully without crashing', async () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard permission denied')),
      },
    });

    const { container } = render(<LatexRenderer latex="x = 1" showCopyButton={true} />);
    const copyBtn = container.querySelector('button');

    // Act
    fireEvent.click(copyBtn!);

    // Assert
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});
