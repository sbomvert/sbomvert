import { fireEvent, render, screen, within } from '@testing-library/react';
import type { PackageFix, VulnDetail } from '@sbomvert/core/vuln/vulnDetail';
import { CVEDetailDrawer } from './CVEDetailDrawer';

const PKG = 'pypi//pypdf@4.0.2';

const grype: VulnDetail = {
  id: 'CVE-2025-9',
  aliases: ['GHSA-vvpx-j8f3-3w6h', 'CVE-2022-41723'],
  severity: 'high',
  score: 7.5,
  status: 'not_fixed',
  source: 'nvd:cpe',
  cvss: [],
  description: 'A flaw in the parser.',
};

// the CVE on the PyPI package, as the CycloneDX scan matches it
const pypi: PackageFix = {
  status: 'fixed',
  fixedVersions: ['6.18.1'],
  severity: 'high',
  score: 8.7,
  source: 'github:language:python',
  cvss: [{ source: 'GitHub', version: '4.0', score: 8.7, vector: 'CVSS:4.0/AV:N/AC:L' }],
  url: 'https://github.com/advisories/GHSA-g9cg-prrw-2r8q',
};
// the same CVE on the Debian package, which no other package shares
const deb: PackageFix = {
  status: 'not_fixed',
  fixedVersions: [],
  severity: 'medium',
  source: 'ubuntu:distro:ubuntu:24.04',
  url: 'https://ubuntu.com/security/CVE-2025-9',
};

const renderDrawer = (
  onClose = jest.fn(),
  packageFixesByTool: Record<string, Record<string, Record<string, PackageFix>>> = {},
  tools = ['grype (CDX)', 'trivy (CDX)'],
) =>
  render(
    <CVEDetailDrawer
      cveId="CVE-2025-9"
      pkg={PKG}
      tools={tools}
      toolColors={{ 'grype (CDX)': '#2563eb', 'trivy (CDX)': '#ea580c', 'grype (SPDX)': '#16a34a' }}
      detailsByTool={{ 'grype (CDX)': { 'CVE-2025-9': grype }, 'trivy (CDX)': {}, 'grype (SPDX)': {} }}
      packageFixesByTool={packageFixesByTool}
      onClose={onClose}
    />,
  );

const cellsOf = (row: HTMLElement) => within(row).getAllByRole('cell').map(cell => cell.textContent);

describe('CVEDetailDrawer', () => {
  test('names the vulnerability and the package it was opened from, and links a CVE id to NVD', () => {
    renderDrawer();

    expect(screen.getByRole('heading', { name: 'CVE-2025-9' })).toBeInTheDocument();
    expect(screen.getByText(PKG)).toBeInTheDocument();
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

  test('shows only the opened package: each tool\'s match on it, and nothing from the CVE\'s other packages', () => {
    renderDrawer(undefined, {
      'grype (CDX)': { [PKG]: { 'CVE-2025-9': pypi }, 'deb/ubuntu/python3-pypdf@4.0.2-1': { 'CVE-2025-9': deb } },
      'grype (SPDX)': { 'deb/ubuntu/python3-pypdf@4.0.2-1': { 'CVE-2025-9': deb } },
    }, ['grype (CDX)', 'grype (SPDX)']);

    const cdxRow = screen.getByRole('rowheader', { name: 'grype (CDX)' }).closest('tr') as HTMLElement;
    expect(cellsOf(cdxRow)).toEqual(['HIGH', '8.7', 'fixed in 6.18.1', 'github:language:python']);

    // SPDX found the CVE on the Debian package, not on this one
    const spdxRow = screen.getByRole('rowheader', { name: 'grype (SPDX)' }).closest('tr') as HTMLElement;
    expect(cellsOf(spdxRow)).toEqual(['—', '—', '—', '—']);
    expect(screen.queryByText('ubuntu:distro:ubuntu:24.04')).not.toBeInTheDocument();
    expect(screen.queryByText('MEDIUM')).not.toBeInTheDocument();
  });

  test('shows the CVSS and advisory of the package\'s own match', () => {
    renderDrawer(undefined, { 'grype (CDX)': { [PKG]: { 'CVE-2025-9': pypi } } });

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('CVSS:4.0/AV:N/AC:L')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://github.com/advisories/GHSA-g9cg-prrw-2r8q' })).toBeInTheDocument();
  });

  test('says what a tool did not report on the package', () => {
    renderDrawer();

    const trivyRow = screen.getByRole('rowheader', { name: 'trivy (CDX)' }).closest('tr') as HTMLElement;
    expect(cellsOf(trivyRow)).toEqual(['—', '—', '—', '—']);
  });

  test('a fix stored without its own severity shows the fix, not another package\'s severity', () => {
    renderDrawer(undefined, {
      'grype (CDX)': { [PKG]: { 'CVE-2025-9': { status: 'fixed', fixedVersions: ['6.18.1'] } as PackageFix } },
    });

    const row = screen.getByRole('rowheader', { name: 'grype (CDX)' }).closest('tr') as HTMLElement;
    expect(cellsOf(row)).toEqual(['—', '—', 'fixed in 6.18.1', '—']);
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
