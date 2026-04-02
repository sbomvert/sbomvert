import { render, screen } from '@testing-library/react';
import AppLayout from './AppLayout';

// Mock Sidebar to isolate layout behavior
jest.mock('./Sidebar', () => () => <div data-testid="sidebar" />);

describe('AppLayout', () => {
  it('renders Sidebar', () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders children inside main content area', () => {
    render(
      <AppLayout>
        <div data-testid="child">Hello</div>
      </AppLayout>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies layout structure classes', () => {
    const { container } = render(
      <AppLayout>
        <div>Test</div>
      </AppLayout>
    );

    // Root container
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('flex');
    expect(root).toHaveClass('h-screen');
    expect(root).toHaveClass('bg-background');

    // Main content area
    const main = container.querySelector('main');
    expect(main).toHaveClass('flex-1');
    expect(main).toHaveClass('overflow-y-auto');
  });

  it('wraps children with padding container', () => {
    const { container } = render(
      <AppLayout>
        <div data-testid="child">Test</div>
      </AppLayout>
    );

    const wrapper = container.querySelector('.p-6');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('max-w-7xl', 'mx-auto');
  });
});