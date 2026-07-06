import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentScans } from './RecentScans';

// Mock fetch globally
global.fetch = jest.fn();

const mockScans = [
  {
    jobId: 'job1',
    image: 'nginx:latest',
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
    expect(screen.getByText('nginx:latest')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  test('renders scan details when expanded', async () => {
    // @ts-ignore
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockScans,
    });

    const user = userEvent.setup();

    render(<RecentScans />);

    await waitFor(() =>
      expect(screen.getByText('job1')).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByText(/Updated:/i)).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
  });

  test('shows no scans message when empty', async () => {
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    render(<RecentScans />);
    await waitFor(() => expect(screen.getByText(/No recent scans found./i)).toBeInTheDocument());
  });
});
