import React from 'react';
import { Card } from '@/components/card/Card';
import { CardHeader } from '@/components/card/CardHeader';
import { getPerToolCounts, getUniqueCveIds, getVulnerablePackageCount } from '@/lib/vuln/cveSummary';
import { CVEReport } from '@/lib/vuln/vulnLoader';

interface CVESummaryProps {
  cves: CVEReport;
}

export const CVESummary: React.FC<CVESummaryProps> = ({ cves }) => {
  const perTool = getPerToolCounts(cves);
  const totalUnique = getUniqueCveIds(cves).size;
  const vulnerablePkgs = getVulnerablePackageCount(cves);

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      {/* CVEs per tool */}
      <Card>
        <CardHeader>CVEs per tool</CardHeader>
        <ul className="list-disc pl-5">
          {Object.entries(perTool).map(([tool, count]) => (
            <li key={tool}>
              {tool}: {count}
            </li>
          ))}
        </ul>
      </Card>

      {/* Total unique CVEs */}
      <Card>
        <CardHeader>Total unique CVEs</CardHeader>
        <div className="text-2xl font-bold" data-testid="total-unique-cves">{totalUnique}</div>
      </Card>

      {/* Vulnerable packages */}
      <Card>
        <CardHeader>Vulnerable packages</CardHeader>
        <div className="text-2xl font-bold" data-testid="vulnerable-packages">{vulnerablePkgs}</div>
      </Card>
    </div>
  );
};
