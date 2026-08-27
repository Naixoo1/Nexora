import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('renders self-contained pure SVG brand emblem without external image dependencies', () => {
    render(<NexoraLogo size="lg" />);

    const svgLogo = screen.getByLabelText('Nexora Logo');
    expect(svgLogo).toBeDefined();
    expect(svgLogo.tagName.toLowerCase()).toBe('svg');
    expect(screen.getByText('Nexora')).toBeDefined();
  });

  it('renders link when href is provided', () => {
    render(<NexoraLogo href="/tasks" />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/tasks');
  });

  it('renders non-link container when href is null', () => {
    render(<NexoraLogo href={null} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Nexora')).toBeDefined();
  });
});
