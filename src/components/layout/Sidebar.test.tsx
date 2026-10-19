import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

// Mock next/navigation
const pushMock = jest.fn();
const useSessionMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('@better-auth-ui/react', () => ({
  useSession: () => useSessionMock(),
}), { virtual: true });

jest.mock('@/lib/auth-client', () => ({
  authClient: {},
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
}));

describe('Sidebar', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'false';
    process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD = 'false';
    pushMock.mockClear();
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

  it('renders 5 buttons when scan API is disabled', () => {
    render(<Sidebar />);

    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('renders 6 buttons when scan API is enabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';

    render(<Sidebar />);

    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /scan/i })).toBeInTheDocument();
  });
  it('calls router.push with correct route on click', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByText('Home'));
    expect(pushMock).toHaveBeenCalledWith('/');

    fireEvent.click(screen.getByText('SBOM Analysis'));
    expect(pushMock).toHaveBeenCalledWith('/compare/analyze');

    fireEvent.click(screen.getByText('SBOM Comparison'));
    expect(pushMock).toHaveBeenCalledWith('/compare/sbom');

    fireEvent.click(screen.getByText('CVE Comparison'));
    expect(pushMock).toHaveBeenCalledWith('/compare/cve');

    fireEvent.click(screen.getByText('Login'));
    expect(pushMock).toHaveBeenCalledWith('/auth/sign-in');

  });

  it('applies layout classes to sidebar', () => {
    const { container } = render(<Sidebar />);

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('w-64', 'bg-background', 'border-r-4');
  });

  it('renders icons for each item', () => {
    render(<Sidebar />);

    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-analysis')).toBeInTheDocument();
    expect(screen.getByTestId('icon-scale')).toBeInTheDocument();
    expect(screen.getByTestId('icon-shieldx')).toBeInTheDocument();
    expect(screen.getByTestId('icon-login')).toBeInTheDocument();
  });

  it('shows a simple signed-in label instead of the login button', () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { email: 'user@example.com' },
        session: { id: 'session-1' },
      },
    });

    render(<Sidebar />);

    expect(screen.getByText('Logged in')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });
});

// TODO: add test when sbom upload is enabled
