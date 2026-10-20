import { render, screen } from '@testing-library/react';
import RootLayout from '@/app/layout';
import '@testing-library/jest-dom'; // ensures DOM matchers are available

// Mock Navbar to avoid rendering the actual component
jest.mock('@/components/navbar/Navbar', () => ({
  Navbar: jest.fn(() => <nav data-testid="navbar">Navbar</nav>),
}));

// Sidebar and Providers pull in @better-auth-ui, which ships ES modules only (Jest can't load them);
// they have their own tests. The Sidebar stand-in shows what the layout passes it.
jest.mock('@/components/layout/Sidebar', () => function Sidebar({ scanEnabled }: { scanEnabled?: boolean }) {
  return <aside data-testid="sidebar">{scanEnabled && <button>Scan</button>}</aside>;
});
jest.mock('@/components/providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// The layout waits for a request (so the scan flag is read at runtime, not at build time)
jest.mock('next/server', () => ({ connection: jest.fn().mockResolvedValue(undefined) }));

// RootLayout is an async server component: await it, then render what it returns
const renderLayout = async (children: React.ReactNode) =>
  render(await RootLayout({ children }));

describe('RootLayout', () => {
  const childrenText = 'Hello, World!';
  // next/jest loads .env files, which may set it: start from unset, restore afterwards
  const original = process.env.NEXT_PUBLIC_ENABLE_SCAN_API;
  beforeEach(() => delete process.env.NEXT_PUBLIC_ENABLE_SCAN_API);
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_ENABLE_SCAN_API;
    else process.env.NEXT_PUBLIC_ENABLE_SCAN_API = original;
  });

  it('renders children inside layout', async () => {
    await renderLayout(childrenText);
    expect(screen.getByText(childrenText)).toBeInTheDocument();
  });

  it('renders Navbar', async () => {
    await renderLayout(childrenText);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('renders footer with current year and license', async () => {
    await renderLayout(childrenText);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(`© ${currentYear} Author jackops.dev - License Apache-2`)
    ).toBeInTheDocument();
  });

  it('renders GitHub repository link correctly', async () => {
    await renderLayout(childrenText);
    const link = screen.getByRole('link', { name: /GitHub Repository/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('https://github.com/sbomvert/sbomvert');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('applies the min-h-screen class to the top div', async () => {
    const { container } = await renderLayout(childrenText);
    const topDiv = container.querySelector('div.min-h-screen');
    expect(topDiv).toBeInTheDocument();
    expect(topDiv).toHaveClass('min-h-screen');
  });

  it('shows the Scan link only when scanning is enabled in the running environment', async () => {
    await renderLayout(childrenText);
    expect(screen.queryByRole('button', { name: /^scan$/i })).not.toBeInTheDocument();
    process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';
    await renderLayout(childrenText);
    expect(screen.getByRole('button', { name: /^scan$/i })).toBeInTheDocument();
  });
});
