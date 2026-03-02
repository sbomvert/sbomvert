import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { TableView } from '@/components/hoc/TableView';

jest.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
}));

const comp = {
  imageId: 'img',
  tools: [{ name: 'Syft', version: '1', vendor: 'A', format: 'SPDX' }],
  allPackages: new Map([['a@1', { package: { name: 'a', version: '1' }, foundInTools: ['Syft'] }]]),
  statistics: { toolCounts: { Syft: 1 }, commonToAll: 1, uniquePerTool: { Syft: 0 } },
};

test('switches filters', () => {
  render(<TableView comparison={comp as any} />);
  fireEvent.click(screen.getByText(/Common/));
  fireEvent.click(screen.getByText(/Unique/));
  expect(screen.getByText(/Package Details/)).toBeInTheDocument();
});
