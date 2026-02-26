import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExportButtons } from './ExportButtons';
import { IMultiToolComparison } from '@/models/IComparisonResult';

describe('ExportButtons', () => {
  const mockComparison: IMultiToolComparison = {
    imageId: 'test-image',
    tools: [
      {
        name: 'Trivy',
        version: '0.40.0',
        vendor: 'Aqua Security',
        format: 'SPDX'
      },
      {
        name: 'Syft',
        version: '0.40.0',
        vendor: 'Anchore',
        format: 'SPDX'
      }
    ],
    allPackages: new Map(),
    statistics: {
      toolCounts: {},
      commonToAll: 0,
      uniquePerTool: {},
      packagesWithConflicts: 0
    },
    infoByTool: {}
  };

  test('renders export buttons and download buttons', () => {
    render(<ExportButtons comparison={mockComparison} />);

    // Check that the export button is rendered
    expect(screen.getByText('Export JSON')).toBeInTheDocument();

    // Check that download buttons are rendered for each tool
    expect(screen.getByText('Download Trivy')).toBeInTheDocument();
    expect(screen.getByText('Download Syft')).toBeInTheDocument();
  });

  test('renders correct number of download buttons', () => {
    render(<ExportButtons comparison={mockComparison} />);

    const downloadButtons = screen.getAllByText(/Download/);
    expect(downloadButtons).toHaveLength(2);
  });
});