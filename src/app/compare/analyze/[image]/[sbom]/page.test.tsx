import { render, screen, waitFor } from '@testing-library/react';
import DetailPage from './page';

jest.mock('next/navigation', () => ({
  useParams: () => ({ image: 'test-image', sbom: 'trivy.json' }),
  useRouter: () => ({ push: jest.fn() })
}));

// Mock fetch for SBOM data
global.fetch = jest.fn();

// Minimal mock for LoadingSpinner component (returns div)
jest.mock('@/components/hoc/LoadingSpinner', () => ({ LoadingSpinner: ({ message }: any) => <div>{message}</div> }));

// Mock other heavy components (Card, PageTitle, etc.)
jest.mock('@/components/card/Card', () => ({ Card: ({ children }: any) => <div>{children}</div> }));
jest.mock('@/components/Title/Title', () => ({ PageTitle: ({ title }: any) => <h1>{title}</h1> }));

describe('Analyze detail page', () => {
  beforeEach(() => {
    // @ts-ignore
    fetch.mockReset();
  });

  test('shows loading spinner initially', () => {
    // fetch never resolves
    // @ts-ignore
    fetch.mockImplementation(() => new Promise(() => {}));
    render(<DetailPage />);
    expect(screen.getByText('Parsing SBOM…')).toBeInTheDocument();
  });

  test('renders page title after successful fetch', async () => {
    const mockDoc = { spdxVersion: 'SPDX-2.2', documentNamespace: '', created: new Date().toISOString(), name: 'test', dataLicense: 'CC0-1.0', packages: [] };
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockDoc });
    render(<DetailPage />);
    await waitFor(() => expect(screen.getByText('test-image')).toBeInTheDocument());
  });
});
