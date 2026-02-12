import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { ComparisonViewSelector } from '@/app/compare/components/ComparisonViewSelector';

test('switches view mode', () => {
  const onChange = jest.fn();
  render(<ComparisonViewSelector viewMode="summary" onViewModeChange={onChange} />);
  fireEvent.click(screen.getByText('Table'));
  expect(onChange).toHaveBeenCalledWith('table');
});
