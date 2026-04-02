import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

// Mock next/navigation
const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

// Mock lucide-react icons (avoid SVG noise)
jest.mock('lucide-react', () => ({
  Shield: () => <svg data-testid="icon-shield" />,
  ShieldX: () => <svg data-testid="icon-shieldx" />,
  Scale: () => <svg data-testid="icon-scale" />,
  Home: () => <svg data-testid="icon-home" />,
  FileChartColumnIncreasing: () => <svg data-testid="icon-analysis" />,
  Upload: () => <svg data-testid="icon-upload" />,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders all navigation items', () => {
    render(<Sidebar />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('SBOM Analysis')).toBeInTheDocument();
    expect(screen.getByText('SBOM Comparison')).toBeInTheDocument();
    expect(screen.getByText('CVE Comparison')).toBeInTheDocument();
  });

  it('renders correct number of buttons', () => {
    render(<Sidebar />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
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
  });
});

// TODO: add test when sbom upload is enabled