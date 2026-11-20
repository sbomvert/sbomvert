import { render, screen } from '@testing-library/react';
import { StaticHeader } from './StaticHeader';

const pathnameMock = jest.fn();
jest.mock('next/navigation', () => ({ usePathname: () => pathnameMock() }));

describe('StaticHeader', () => {
  it('links home and to the two pages of the static build, and marks the current one', () => {
    pathnameMock.mockReturnValue('/compare/analyze/local');
    render(<StaticHeader />);

    expect(screen.getByRole('link', { name: 'SBOMVert' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'SBOM Analysis' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Translate SBOM' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Switch theme' })).toBeInTheDocument();
  });
});
