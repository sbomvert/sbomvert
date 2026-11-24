import { fireEvent, render, screen } from '@testing-library/react';
import Sidebar from './Sidebar';

const pathnameMock = jest.fn();
const useSessionMock = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

jest.mock('@better-auth-ui/react', () => ({
  useSession: () => useSessionMock(),
}), { virtual: true });

jest.mock('@/lib/auth-client', () => ({
  authClient: {},
}));

// The real one imports @better-auth-ui, which ships ES modules only (Jest can't load them)
jest.mock('@/components/auth/user/user-button', () => ({
  UserButton: ({ size }: { size?: string }) => <span>{size === 'icon' ? 'Avatar' : 'Logged in'}</span>,
}));

// Mock lucide-react icons (avoid SVG noise)
jest.mock('lucide-react', () => ({
  Shield: () => <svg data-testid="icon-shield" />,
  ShieldX: () => <svg data-testid="icon-shieldx" />,
  Scale: () => <svg data-testid="icon-scale" />,
  Home: () => <svg data-testid="icon-home" />,
  FileChartColumnIncreasing: () => <svg data-testid="icon-analysis" />,
  Upload: () => <svg data-testid="icon-upload" />,
  ScanText: () => <svg data-testid="icon-scan" />,
  LogIn: () => <svg data-testid="icon-login" />,
  ArrowLeftRight: () => <svg data-testid="icon-translate" />,
  Moon: () => <svg data-testid="icon-moon" />,
  Sun: () => <svg data-testid="icon-sun" />,
}));

describe('Sidebar', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'false';
    process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD = 'false';
    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    pathnameMock.mockReturnValue('/');
    useSessionMock.mockClear();
    useSessionMock.mockReturnValue({ data: null });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('renders all navigation items', () => {
    render(<Sidebar />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('SBOM Analysis')).toBeInTheDocument();
    expect(screen.getByText('SBOM Comparison')).toBeInTheDocument();
    expect(screen.getByText('CVE Comparison')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('lists only the pages of the static build in static mode', () => {
    process.env.NEXT_PUBLIC_STATIC_MODE = 'true';
    process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD = 'true';

    render(<Sidebar />);

    expect(screen.getAllByRole('link').map(b => b.textContent)).toEqual(['SBOMVert', 'Home', 'SBOM Analysis', 'Translate SBOM']);
  });

  it('has no login or account controls when auth is disabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'false';

    render(<Sidebar />);

    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(6);
    // useSession needs the AuthProvider, which is not rendered without auth
    expect(useSessionMock).not.toHaveBeenCalled();
  });

  it('renders 7 links (the logo and 6 pages) when scan API is disabled', () => {
    render(<Sidebar />);

    expect(screen.getAllByRole('link')).toHaveLength(7);
  });

  it('renders 8 links (the logo and 7 pages) when scanning is enabled (passed in by the server layout)', () => {
    render(<Sidebar scanEnabled />);

    expect(screen.getAllByRole('link')).toHaveLength(8);
    expect(screen.getByRole('link', { name: /^scan$/i })).toBeInTheDocument();
  });

  it('links each item to its page', () => {
    render(<Sidebar />);

    const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href('Home')).toBe('/');
    expect(href('SBOM Analysis')).toBe('/compare/analyze');
    expect(href('SBOM Comparison')).toBe('/compare/sbom');
    expect(href('CVE Comparison')).toBe('/compare/cve');
    expect(href('Translate SBOM')).toBe('/translate');
    expect(href('Login')).toBe('/auth/sign-in');
  });

  it('marks the current page, also on its sub-pages', () => {
    pathnameMock.mockReturnValue('/compare/sbom/artifact');
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'SBOM Comparison' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('is a rail of icons on a phone and full width from md up', () => {
    const { container } = render(<Sidebar />);

    expect(container.querySelector('aside')).toHaveClass('w-16', 'md:w-60');
  });

  it('renders icons for each item', () => {
    render(<Sidebar />);

    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-analysis')).toBeInTheDocument();
    expect(screen.getByTestId('icon-scale')).toBeInTheDocument();
    expect(screen.getByTestId('icon-shieldx')).toBeInTheDocument();
    expect(screen.getByTestId('icon-login')).toBeInTheDocument();
  });

  it('shows the account (just the avatar on the phone rail) instead of the login button', () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { email: 'user@example.com' },
        session: { id: 'session-1' },
      },
    });

    render(<Sidebar />);

    expect(screen.getByText('Logged in')).toBeInTheDocument();
    expect(screen.getByText('Avatar')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });
  it('switches the theme from the bottom of the sidebar', () => {
    document.documentElement.classList.remove('dark');
    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: /theme/i }));
    expect(document.documentElement).toHaveClass('dark');
    fireEvent.click(screen.getByRole('button', { name: /theme/i }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

// TODO: add test when sbom upload is enabled
