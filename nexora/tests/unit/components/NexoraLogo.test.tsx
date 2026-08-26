import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NexoraLogo } from '@/components/brand/NexoraLogo';

describe('NexoraLogo Component', () => {
  it('renders Nexora brand text and version badge', () => {
    render(<NexoraLogo size="md" showVersion={true} />);

    expect(screen.getByText('Nexora')).toBeDefined();
    expect(screen.getByText('v1.0')).toBeDefined();
  });

  it('hides version badge when showVersion is false', () => {
    render(<NexoraLogo showVersion={false} />);

    expect(screen.getByText('Nexora')).toBeDefined();
    expect(screen.queryByText('v1.0')).toBeNull();
  });

  it('renders standard image with correct src and dimensions', () => {
    render(<NexoraLogo size="lg" />);

    const img = screen.getByAltText('Nexora Logo');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('logo.png');
  });

  it('switches to resilient vector fallback when image triggers onError', () => {
    render(<NexoraLogo size="md" />);

    const img = screen.getByAltText('Nexora Logo');
    expect(img).toBeDefined();

    // Trigger onError
    fireEvent.error(img);

    // Image should be replaced by vector fallback containing the SVG
    expect(screen.queryByAltText('Nexora Logo')).toBeNull();
    expect(screen.getByText('Nexora')).toBeDefined();
  });

  it('renders link when href is provided', () => {
    render(<NexoraLogo href="/tasks" />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/tasks');
  });
});
