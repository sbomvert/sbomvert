import React from 'react';
import { render, screen } from '@/test-utils';
import { LoadingSpinner } from '@/app/compare/components/LoadingSpinner';

test('renders with default message', () => {
  render(<LoadingSpinner />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
