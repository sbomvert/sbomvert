import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { PurlAnalysisCard } from '@/components/hoc/PurlAnalysisCard';

jest.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

test('shows empty state without purl/cpe', () => {
  render(<PurlAnalysisCard />);
  expect(screen.getByText(/No pURL or CPE available/)).toBeInTheDocument();
});

test('expands to show purl components', () => {
  render(<PurlAnalysisCard purl="pkg:npm/express@4.18.2" />);
  fireEvent.click(screen.getByText(/Package Identifiers/));
  expect(screen.getByText(/pURL Components/)).toBeInTheDocument();
  expect(screen.getByText('express')).toBeInTheDocument();
});
