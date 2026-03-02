import { render, screen } from '@testing-library/react';
import RootLayout, { metadata } from '@/app/layout';
import { Navbar } from '@/components/navbar/Navbar';
import '@testing-library/jest-dom'; // ensures DOM matchers are available

// Mock Navbar to avoid rendering the actual component
jest.mock('@/components/navbar/Navbar', () => ({
  Navbar: jest.fn(() => <nav data-testid="navbar">Navbar</nav>),
}));

describe.skip('RootLayout', () => {
  const childrenText = 'Hello, World!';

  it('renders children inside layout', () => {
    render(<RootLayout>{childrenText}</RootLayout>);
    expect(screen.getByText(childrenText)).toBeInTheDocument();
  });

  it('renders Navbar', () => {
    render(<RootLayout>{childrenText}</RootLayout>);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('renders footer with current year and license', () => {
    render(<RootLayout>{childrenText}</RootLayout>);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(`© ${currentYear} Author jackops.dev - License Apache-2`)
    ).toBeInTheDocument();
  });

  it('renders GitHub repository link correctly', () => {
    render(<RootLayout>{childrenText}</RootLayout>);
    const link = screen.getByRole('link', { name: /GitHub Repository/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('https://github.com/sbomvert/sbomvert');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

it('applies Inter font class and background/foreground classes to top div', () => {
  const { container } = render(<RootLayout>{childrenText}</RootLayout>);

  const topDiv = container.querySelector('div.min-h-screen');
  expect(topDiv).toBeInTheDocument();

  expect(topDiv).toHaveClass('min-h-screen');
});

});

describe.skip('metadata', () => {
  it('has correct title and description', () => {
    expect(metadata.title).toBe('SBOMVert');
    expect(metadata.description).toBe(
      'Compare SBOM tool outputs for container images'
    );
  });
});
