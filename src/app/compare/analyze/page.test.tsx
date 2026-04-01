import { render, screen, waitFor } from '@testing-library/react';
import AnalyzePage from './page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

// Mock global fetch for fetchContainers
global.fetch = jest.fn();

describe('Analyze page loading and empty state', () => {
  beforeEach(() => {
    // @ts-ignore
    fetch.mockReset();
  });

  test('shows loading spinner initially', () => {
    // mock fetch to never resolve to keep loading state
    // @ts-ignore
    fetch.mockImplementation(() => new Promise(() => {}));
    render(<AnalyzePage />);
    expect(screen.getByText(/Loading…/i)).toBeInTheDocument();
  });

  test('shows no SBOMs message when fetch returns empty', async () => {
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ containers: [], pagination: { totalPages: 1 } }) });
    render(<AnalyzePage />);
    await waitFor(() => expect(screen.getByText(/No SBOMs found/i)).toBeInTheDocument());
  });
});
