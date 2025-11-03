import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { ComparisonTypeSelector } from '@/app/compare/components/ComparisonTypeSelector';

jest.mock('framer-motion', () => ({
  motion: { div: (props: any) => <div {...props} /> },
}));

test('calls onComparisonTypeChange to SBOM', () => {
  const onChange = jest.fn();
  render(<ComparisonTypeSelector comparisonType="SBOM" onComparisonTypeChange={onChange} />);
  fireEvent.click(screen.getByText(/SBOM Comparison/));
  expect(onChange).toHaveBeenCalledWith('SBOM');
});

test('renders disabled CVE button', () => {
  render(<ComparisonTypeSelector comparisonType="SBOM" onComparisonTypeChange={() => {}} />);
  expect(screen.getByText(/CVE Comparison/)).toBeDisabled();
});


