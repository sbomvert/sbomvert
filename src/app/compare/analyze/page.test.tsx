import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyzePage from './page.static';

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

  test('opens the Load SBOM dialog and closes it on Cancel', async () => {
    // @ts-ignore
    fetch.mockResolvedValue({ ok: true, json: async () => ({ containers: [], pagination: { totalPages: 1 } }) });
    render(<AnalyzePage />);
    await userEvent.click(screen.getByRole('button', { name: 'Load SBOM' }));
    const dialog = await screen.findByRole('dialog', { name: 'Load SBOM' });
    expect(dialog).toContainElement(screen.getByLabelText('SBOM File (JSON)'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('Analyze page in the static build', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STATIC_MODE = 'true';
    // @ts-ignore
    fetch.mockReset();
  });
  afterEach(() => delete process.env.NEXT_PUBLIC_STATIC_MODE);

  test('shows the Load SBOM form on the page and asks no server', () => {
    render(<AnalyzePage />);
    expect(screen.getByLabelText('SBOM File (JSON)')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
