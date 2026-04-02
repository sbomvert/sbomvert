import React from 'react';
import { render, screen } from '@testing-library/react';
import { CVESummary } from './CVESummary';

// Mock dependencies to control inputs deterministically
jest.mock('@/lib/vuln/cveSummary', () => ({
  getPerToolCounts: jest.fn(),
  getUniqueCveIds: jest.fn(),
  getVulnerablePackageCount: jest.fn(),
}));

import {
  getPerToolCounts,
  getUniqueCveIds,
  getVulnerablePackageCount,
} from '@/lib/vuln/cveSummary';

jest.mock('@/components/card/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/card/CardHeader', () => ({
  CardHeader: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

describe('CVESummary', () => {
  const mockCves = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders per-tool CVE counts', () => {
    (getPerToolCounts as jest.Mock).mockReturnValue({
      toolA: 5,
      toolB: 3,
    });

    (getUniqueCveIds as jest.Mock).mockReturnValue(new Set());
    (getVulnerablePackageCount as jest.Mock).mockReturnValue(0);

    render(<CVESummary cves={mockCves} />);

    expect(screen.getByText('toolA: 5')).toBeInTheDocument();
    expect(screen.getByText('toolB: 3')).toBeInTheDocument();
  });

  test('renders total unique CVEs', () => {
    (getPerToolCounts as jest.Mock).mockReturnValue({});
    (getUniqueCveIds as jest.Mock).mockReturnValue(new Set(['CVE-1', 'CVE-2']));
    (getVulnerablePackageCount as jest.Mock).mockReturnValue(0);

    render(<CVESummary cves={mockCves} />);

    expect(screen.getByTestId('total-unique-cves')).toHaveTextContent('2');
  });

  test('renders vulnerable package count', () => {
    (getPerToolCounts as jest.Mock).mockReturnValue({});
    (getUniqueCveIds as jest.Mock).mockReturnValue(new Set());
    (getVulnerablePackageCount as jest.Mock).mockReturnValue(7);

    render(<CVESummary cves={mockCves} />);

    expect(screen.getByTestId('vulnerable-packages')).toHaveTextContent('7');
  });

  test('calls helper functions with cves input', () => {
    const input = { some: 'data' };

    (getPerToolCounts as jest.Mock).mockReturnValue({});
    (getUniqueCveIds as jest.Mock).mockReturnValue(new Set());
    (getVulnerablePackageCount as jest.Mock).mockReturnValue(0);

    render(<CVESummary cves={input as any} />);

    expect(getPerToolCounts).toHaveBeenCalledWith(input);
    expect(getUniqueCveIds).toHaveBeenCalledWith(input);
    expect(getVulnerablePackageCount).toHaveBeenCalledWith(input);
  });

  test('handles empty tool map', () => {
    (getPerToolCounts as jest.Mock).mockReturnValue({});
    (getUniqueCveIds as jest.Mock).mockReturnValue(new Set());
    (getVulnerablePackageCount as jest.Mock).mockReturnValue(0);

    render(<CVESummary cves={mockCves} />);

    // Ensure no list items are rendered
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  test('renders multiple tools correctly', () => {
    (getPerToolCounts as jest.Mock).mockReturnValue({
      trivy: 10,
      grype: 4,
      syft: 2,
    });

    (getUniqueCveIds as jest.Mock).mockReturnValue(new Set());
    (getVulnerablePackageCount as jest.Mock).mockReturnValue(0);

    render(<CVESummary cves={mockCves} />);

    expect(screen.getByText('trivy: 10')).toBeInTheDocument();
    expect(screen.getByText('grype: 4')).toBeInTheDocument();
    expect(screen.getByText('syft: 2')).toBeInTheDocument();
  });
});