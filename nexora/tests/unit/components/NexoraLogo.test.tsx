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

  it('renders brand emblem image using /logo.svg with fallback support', () => {
    render(<NexoraLogo size="lg" />);

    const logoImg = screen.getByAltText('Nexora Logo');
    expect(logoImg).toBeDefined();
    expect(logoImg.getAttribute('src')).toContain('logo.svg');
    expect(screen.getByText('Nexora')).toBeDefined();
  });

  it('renders vector fallback on image load error', () => {
    render(<NexoraLogo size="md" src="/non-existent-logo.svg" />);

    const logoImg = screen.getByAltText('Nexora Logo');
    fireEvent.error(logoImg);

    expect(screen.getByLabelText('Nexora Logo Fallback')).toBeDefined();
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
