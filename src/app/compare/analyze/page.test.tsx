import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyzePage from './page.static';
import { useSbomStore } from '@/store/useSbomStore';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

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
    expect(dialog).toContainElement(screen.getByLabelText('SBOM (JSON)'));
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
    expect(screen.getByLabelText('SBOM (JSON)')).toBeInTheDocument();
    expect(screen.queryByLabelText('SBOM name')).toBeNull();
    expect(screen.queryByLabelText('Container name')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('Loading an SBOM to analyze', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STATIC_MODE = 'true';
    mockPush.mockReset();
  });
  afterEach(() => delete process.env.NEXT_PUBLIC_STATIC_MODE);

  const load = async (json: string) => {
    const user = userEvent.setup();
    render(<AnalyzePage />);
    await user.click(screen.getByLabelText('SBOM (JSON)'));
    await user.paste(json);
    await user.click(screen.getByRole('button', { name: 'Load SBOM' }));
  };

  test('analyzes a CycloneDX SBOM', async () => {
    await load(JSON.stringify({
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      metadata: { tools: { components: [{ name: 'cdxgen', version: '12.9.0' }] }, component: { name: 'busybox', version: '1.38.0' } },
      components: [{ name: 'busybox', version: '1.38.0', purl: 'pkg:apk/alpine/busybox@1.38.0' }],
    }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/compare/analyze/local'));
    // no names asked in the static build: the SBOM's tool, format and subject
    expect(useSbomStore.getState()).toMatchObject({ name: 'cdxgen.cdx.json', containerName: 'busybox:1.38.0', info: { tool: 'Cdxgen' } });
    expect(useSbomStore.getState().packages).toHaveLength(1);
  });

  test('says when the JSON is no SBOM', async () => {
    await load('{"hello":"world"}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Not an SPDX or CycloneDX SBOM');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
