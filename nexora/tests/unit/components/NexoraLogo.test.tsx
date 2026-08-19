import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NexoraLogo } from '@/components/brand/NexoraLogo';

describe('NexoraLogo', () => {
  it('renders Nexora logo image, title, and version badge by default', () => {
    render(<NexoraLogo />);

    const img = screen.getByAltText('Nexora Logo');
    expect(img).toBeDefined();

    const title = screen.getByText('Nexora');
    expect(title).toBeDefined();

    const version = screen.getByText('v1.0');
    expect(version).toBeDefined();
  });

  it('hides version badge when showVersion is false', () => {
    render(<NexoraLogo showVersion={false} />);

    expect(screen.queryByText('v1.0')).toBeNull();
    expect(screen.getByText('Nexora')).toBeDefined();
  });

  it('renders custom href link target', () => {
    const { container } = render(<NexoraLogo href="/canvas" />);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/canvas');
  });
});
