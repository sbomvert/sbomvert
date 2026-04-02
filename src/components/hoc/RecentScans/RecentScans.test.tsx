import { render, screen, waitFor } from '@testing-library/react';
import { RecentScans } from './RecentScans';

// Mock fetch globally
global.fetch = jest.fn();

const mockScans = [
  {
    jobId: 'job1',
    status: 'completed',
    updatedAt: new Date().toISOString(),
    history: [{ level: 'info', message: 'Started' }],
  },
];

describe('RecentScans component', () => {
  beforeEach(() => {
    // @ts-ignore
    fetch.mockReset();
  });

  test('shows loading state initially', async () => {
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockScans });
    render(<RecentScans />);
    expect(screen.getByText(/Loading recent scans…/i)).toBeInTheDocument();
    // Wait for fetch to resolve and component to update
    await waitFor(() => expect(screen.queryByText(/Loading recent scans…/i)).not.toBeInTheDocument());
  });

  test('renders scans after fetch', async () => {
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockScans });
    render(<RecentScans />);
    await waitFor(() => expect(screen.getByText('job1')).toBeInTheDocument());
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
  });

  test('shows no scans message when empty', async () => {
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    render(<RecentScans />);
    await waitFor(() => expect(screen.getByText(/No recent scans found./i)).toBeInTheDocument());
  });
});
