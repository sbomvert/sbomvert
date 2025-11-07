import React, { PropsWithChildren } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Define a type for the custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  provideTheme?: boolean;
}

/**
 * Custom render function that can optionally wrap components with providers
 * @param ui The React component to render
 * @param options Custom render options including provider flags
 */
export const customRender = (
  ui: React.ReactElement,
  { provideTheme = true, ...options }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: PropsWithChildren) => {
    if (provideTheme) {
      return (
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
        </ThemeProvider>
      );
    }
    return <>{children}</>;
  };

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
    user: userEvent.setup()
  };
};

// re-export everything
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { customRender as render };

// Common test data
export const mockSbomData = {
  containers: [
    {
      name: 'test-container',
      files: [
        { name: 'syft.spdx.json', path: '/sbom/test-container/syft.spdx.json' },
        { name: 'trivy.spdx.json', path: '/sbom/test-container/trivy.spdx.json' }
      ]
    }
  ],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 1,
    itemsPerPage: 8
  }
};

// Common utility functions for tests
export const createMockUrl = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
};

// Mock Next.js navigation utilities
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  events: {
    on: (event: string, cb: () => void) => jest.fn()(event, cb),
    off: (event: string, cb: () => void) => jest.fn()(event, cb),
    emit: (event: string, ...args: any[]) => jest.fn()(event, ...args)
  }
};
