import { fireEvent, render, screen, within } from '@testing-library/react';
import { emptyReport } from '@sbomvert/core/vuln/vulnutils';
import { useArtifactStore } from '@/store/useArtifactStore';
import CVEPage from './page';

const report = (vulns: Record<string, string[]>) => ({
  ...emptyReport(),
  vulns_by_package: vulns,
  cves: Object.values(vulns).flat(),
  totalCVEs: Object.values(vulns).flat().length,
});

jest.mock('@/lib/vuln/vulnLoader', () => ({
  loadCVEsForImage: jest.fn(async () => ({
    cves: {
      grype: report({ openssl: ['CVE-2024-1', 'CVE-2024-2'], zlib: ['CVE-2023-9'] }),
      trivy: report({ openssl: ['CVE-2024-1'], curl: ['CVE-2022-5'] }),
    },
  })),
}));

const table = () => screen.getByRole('table');

beforeEach(() => useArtifactStore.setState({ selectedImage: 'nginx:1.27' }));

test('shows the image, the summary and the exclusive packages', async () => {
  render(<CVEPage />);
  expect(await screen.findByRole('heading', { name: 'nginx:1.27' })).toBeInTheDocument();
  expect(screen.getByText('CVE Comparison')).toBeInTheDocument();
  expect(screen.getAllByText('Unique CVEs')[0].nextSibling).toHaveTextContent('4');
  expect(screen.getByText('Exclusive vulnerable packages')).toBeInTheDocument();
});

test('the table filters by search and by the tool that alone found a package', async () => {
  render(<CVEPage />);
  fireEvent.click(await screen.findByText('table'));
  expect(within(table()).getAllByRole('row')).toHaveLength(4); // header + 3 packages

  fireEvent.change(screen.getByPlaceholderText('Search packages'), { target: { value: 'ssl' } });
  expect(within(table()).getAllByRole('row')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

  fireEvent.click(screen.getByRole('button', { name: 'only trivy' }));
  expect(screen.getByRole('button', { name: 'only trivy' })).toHaveAttribute('aria-pressed', 'true');
  const rows = within(table()).getAllByRole('row');
  expect(rows).toHaveLength(2);
  expect(rows[1]).toHaveTextContent('curl');

  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  expect(within(table()).getAllByRole('row')).toHaveLength(4);
});

test('expanding a row lists its CVEs', async () => {
  render(<CVEPage />);
  fireEvent.click(await screen.findByText('table'));
  fireEvent.click(within(table()).getByText('openssl'));
  expect(screen.getAllByRole('button', { name: 'CVE-2024-2' }).length).toBeGreaterThan(0);
});
