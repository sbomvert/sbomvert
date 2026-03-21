import React from 'react';
import { render, screen } from '@testing-library/react';
import { CVESummary } from '@/components/cve/CVESummary';
import { CVEReport } from '@/lib/vuln/vulnLoader';
import { VulnReport } from '@/lib/vuln/vulnutils';

const mockReport: VulnReport = {
  totalCVEs: 0,
  cves: ['CVE-1', 'CVE-2'],
  library: 0,
  language: 0,
  packagelist: [],
  vulns_by_package: {
    pkgA: ['CVE-1'],
    pkgB: ['CVE-2']
  },
  vulnpackagelist: {},
  purl_mapping: {}
};

const cves: CVEReport = {
  toolX: mockReport,
  toolY: { ...mockReport, cves: ['CVE-2', 'CVE-3'], vulns_by_package: { pkgB: ['CVE-2'], pkgC: ['CVE-3'] } }
};

test('CVESummary renders per‑tool counts and totals', () => {
  render(<CVESummary cves={cves} />);
  // per‑tool counts
  expect(screen.getByText('toolX: 2')).toBeInTheDocument();
  expect(screen.getByText('toolY: 2')).toBeInTheDocument();
  // total unique CVEs
  expect(screen.getByText('3')).toBeInTheDocument(); // total unique CVEs
  // vulnerable packages count
  expect(screen.getAllByText('3')[1]).toBeInTheDocument(); // vulnerable packages (pkgA, pkgB, pkgC)
});
