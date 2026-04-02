import { render, screen, fireEvent } from '@testing-library/react';
import { CVEStatCard } from './cveStatCard';

describe('CVEStatCard component', () => {
  test('calculates coverage percentage correctly', () => {
    render(
      <CVEStatCard
        tool="trivy"
        color="#ff0000"
        totalVulns={100}
        uniqueVulns={25}
        vulnerablePackages={10}
        globalUnique={50}
      />
    );
    // Verify displayed values
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Unique CVEs')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Vuln Pkgs')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    // Coverage should be 50%
    expect(screen.getByText('Coverage vs unique total')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('handles zero globalUnique without division error', () => {
    render(
      <CVEStatCard
        tool="syft"
        color="blue"
        totalVulns={5}
        uniqueVulns={0}
        vulnerablePackages={0}
        globalUnique={0}
      />
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
