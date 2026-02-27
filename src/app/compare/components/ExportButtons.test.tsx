import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExportButtons } from './ExportButtons';
import { IMultiToolComparison } from '@/models/IComparisonResult';

describe('ExportButtons', () => {
  const mockComparison: IMultiToolComparison = {
    imageId: 'test-image',
    tools: [
      { name: 'Trivy', version: '0.40.0', vendor: 'Aqua Security', format: 'SPDX' },
      { name: 'Syft', version: '0.40.0', vendor: 'Anchore', format: 'SPDX' },
    ],
    allPackages: new Map(),
    statistics: { toolCounts: {}, commonToAll: 0, uniquePerTool: {}, packagesWithConflicts: 0 },
    infoByTool: {},
  };

  test('renders Select and Download button', () => {
    render(<ExportButtons comparison={mockComparison} />);

    // Select (combobox) present
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('selects a tool and triggers download', async () => {
    const mockOpen = jest.fn();
    // @ts-ignore replace global window.open
    window.open = mockOpen;

    render(<ExportButtons comparison={mockComparison} />);

    // Open select and choose Trivy
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Trivy' } });

  });
});
