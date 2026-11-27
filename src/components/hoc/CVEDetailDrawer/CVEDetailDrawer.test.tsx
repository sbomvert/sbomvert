import { fireEvent, render, screen, within } from '@testing-library/react';
import type { VulnDetail } from '@sbomvert/core/vuln/vulnDetail';
import { CVEDetailDrawer } from './CVEDetailDrawer';

const grype: VulnDetail = {
  id: 'CVE-2025-9',
  aliases: ['GHSA-vvpx-j8f3-3w6h', 'CVE-2022-41723'],
  severity: 'high',
  score: 7.5,
  status: 'not_fixed',
  source: 'nvd:cpe',
  cvss: [{ source: 'nvd@nist.gov', version: '3.1', score: 7.5, vector: 'CVSS:3.1/AV:N/AC:L/PR:N' }],
  url: 'https://example.org/advisory',
  description: 'A flaw in the parser.',
};

const renderDrawer = (onClose = jest.fn()) =>
  render(
    <CVEDetailDrawer
      cveId="CVE-2025-9"
      tools={['grype (CDX)', 'trivy (CDX)']}
      toolColors={{ 'grype (CDX)': '#2563eb', 'trivy (CDX)': '#ea580c' }}
      detailsByTool={{ 'grype (CDX)': { 'CVE-2025-9': grype }, 'trivy (CDX)': {} }}
      onClose={onClose}
    />,
  );

describe('CVEDetailDrawer', () => {
  test('names the vulnerability and links a CVE id to NVD', () => {
    renderDrawer();

    expect(screen.getByRole('heading', { name: 'CVE-2025-9' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in NVD' })).toHaveAttribute('href', 'https://nvd.nist.gov/vuln/detail/CVE-2025-9');
  });

  test('shows the description, and the tool it came from', () => {
    renderDrawer();

    expect(screen.getByText('A flaw in the parser.')).toBeInTheDocument();
    expect(screen.getByText('from grype (CDX)')).toBeInTheDocument();
  });

  test('lists the other ids, and links the CVE ones to NVD', () => {
    renderDrawer();

    expect(screen.getByText('GHSA-vvpx-j8f3-3w6h')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CVE-2022-41723' })).toHaveAttribute('href', 'https://nvd.nist.gov/vuln/detail/CVE-2022-41723');
  });

  test('shows severity, score and fix per tool, and says what a tool did not report', () => {
    renderDrawer();

    const grypeRow = screen.getByRole('rowheader', { name: 'grype (CDX)' }).closest('tr') as HTMLElement;
    expect(within(grypeRow).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['HIGH', '7.5', 'no fix', 'nvd:cpe']);

    const trivyRow = screen.getByRole('rowheader', { name: 'trivy (CDX)' }).closest('tr') as HTMLElement;
    expect(within(trivyRow).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      '—', '—', '—', '—',
    ]);
  });

  test('shows each CVSS score with its source, version and vector', () => {
    renderDrawer();

    expect(screen.getByText('nvd@nist.gov')).toBeInTheDocument();
    expect(screen.getByText('CVSS:3.1/AV:N/AC:L/PR:N')).toBeInTheDocument();
  });

  test('links the one advisory each tool gives', () => {
    renderDrawer();

    expect(screen.getByRole('link', { name: 'https://example.org/advisory' })).toHaveAttribute('href', 'https://example.org/advisory');
  });

  test('closes on the close button, the overlay and Escape', () => {
    const onClose = jest.fn();
    renderDrawer(onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
