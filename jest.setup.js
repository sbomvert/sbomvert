import '@testing-library/jest-dom';
import 'whatwg-fetch';
// Set test environment
process.env.NODE_ENV = 'test';

// Mock next/server components
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
    }),
  },
}));

// Mock fs module
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
  };
});

jest.mock('recharts', () => {
  const React = require('react');
  return {
    BarChart:          ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar:               () => null,
    XAxis:             () => null,
    YAxis:             () => null,
    CartesianGrid:     () => null,
    Tooltip:           () => null,
    Legend:            () => null,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    LineChart:         ({ children }) => <div>{children}</div>,
    Line:              () => null,
    PieChart:          ({ children }) => <div>{children}</div>,
    Pie:               () => null,
    Cell:              () => null,
  };
});


jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Configure test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
