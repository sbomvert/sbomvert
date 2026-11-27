import { fireEvent, render, screen } from '@testing-library/react';
import type { VulnDetail } from '@sbomvert/core/vuln/vulnDetail';
import { PackageTableRow } from './CVEPackageTableRow';
import { PackageRow } from '@/lib/vuln/cveSummary';

const detail = (over: Partial<VulnDetail>): VulnDetail => ({
  id: over.id ?? 'CVE-2024-0000',
  aliases: [],
  severity: 'unknown',
  status: 'unknown',
  cvss: [],
  ...over,
});

describe('PackageTableRow', () => {
  const row: PackageRow = {
    pkg: 'libssl3',
    byCve: { trivy: ['CVE-2024-0002', 'CVE-2024-0001', 'CVE-2024-0003'] },
    detectedBy: new Set(['trivy']),
  };

  const renderExpanded = (cveDetails: Record<string, Record<string, VulnDetail>>, onSelectCve = jest.fn()) =>
    render(
      <table>
        <tbody>
          <PackageTableRow
            row={row}
            tools={['trivy']}
            toolColors={{ trivy: '#6366f1' }}
            cveDetails={cveDetails}
            onSelectCve={onSelectCve}
            isExpanded
            onToggle={() => {}}
          />
        </tbody>
      </table>,
    );

  test('lists the CVEs as strings, in order', () => {
    renderExpanded({});

    const ids = screen.getAllByRole('button').map(button => button.textContent);
    expect(ids).toEqual(['CVE-2024-0001', 'CVE-2024-0002', 'CVE-2024-0003']);
  });

  test('shows the severity and score next to each CVE the report has them for', () => {
    renderExpanded({
      trivy: {
        'CVE-2024-0001': detail({ severity: 'high', score: 7.5 }),
        'CVE-2024-0002': detail({ severity: 'low' }),
      },
    });

    expect(screen.getByText('HIGH · 7.5 · fix unknown')).toBeInTheDocument();
    expect(screen.getByText('LOW · fix unknown')).toBeInTheDocument();
  });

  test('says which version fixes a CVE, that there is no fix, or that the fix is unknown', () => {
    renderExpanded({
      trivy: {
        'CVE-2024-0001': detail({ severity: 'high', status: 'fixed', fixedVersion: '2.5' }),
        'CVE-2024-0002': detail({ severity: 'low', status: 'not_fixed' }),
        'CVE-2024-0003': detail({ severity: 'unknown', status: 'unknown' }),
      },
    });

    expect(screen.getByText('HIGH · fixed in 2.5')).toBeInTheDocument();
    expect(screen.getByText('LOW · no fix')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN · fix unknown')).toBeInTheDocument();
  });

  test('reports the CVE clicked, so its details can open', () => {
    const onSelectCve = jest.fn();
    renderExpanded({}, onSelectCve);

    fireEvent.click(screen.getByRole('button', { name: 'CVE-2024-0002' }));

    expect(onSelectCve).toHaveBeenCalledWith('CVE-2024-0002');
  });

  test('shows the CVE alone when the report has no details for it', () => {
    renderExpanded({});

    expect(screen.queryByText(/HIGH|LOW|MEDIUM|CRITICAL|UNKNOWN/)).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  test("shows each CVE's fix on this package, not the CVE-level one", () => {
    render(
      <table>
        <tbody>
          <PackageTableRow
            row={row}
            tools={['trivy']}
            toolColors={{ trivy: '#6366f1' }}
            cveDetails={{ trivy: { 'CVE-2024-0001': detail({ severity: 'high', status: 'fixed' }) } }}
            packageFixes={{
              trivy: { [row.pkg]: { 'CVE-2024-0001': { status: 'fixed', fixedVersions: ['2.5'] }, 'CVE-2024-0002': { status: 'fixed', fixedVersions: ['2.5', '3.0'] } } },
            }}
            onSelectCve={() => {}}
            isExpanded
            onToggle={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('HIGH · fixed in 2.5')).toBeInTheDocument();
    expect(screen.getByText('fixed')).toBeInTheDocument();
  });
});
