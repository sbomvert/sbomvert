/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExportButtons } from './ExportButtons';

describe('ExportButtons component basic render', () => {
  const comparison = {
    imageId: 'myrepo/image:latest',
    tools: [{ name: 'Syft', format: 'CycloneDX' }],
  } as any;

  it('renders selector with tool options', () => {
    render(<ExportButtons comparison={comparison} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'Syft' } });
    // No assertion on download; just ensure no errors
  });
});
