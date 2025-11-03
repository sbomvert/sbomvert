import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { ExportButtons } from '@/app/compare/components/ExportButtons';

beforeEach(() => {
  URL.createObjectURL = jest.fn(() => 'blob:1') as any;
  URL.revokeObjectURL = jest.fn() as any;
  (global as any).alert = jest.fn();
  const originalCreate = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation(((tagName: any) => {
    if (tagName === 'a') {
      const a = originalCreate('a');
      Object.defineProperty(a, 'click', { value: jest.fn() });
      return a as any;
    }
    return originalCreate(tagName);
  }) as any);
});

const comp = {
  imageId: 'img',
  tools: [{ name: 'Syft', version: '1', vendor: 'A', format: 'SPDX' }],
  allPackages: new Map([['a@1', { package: { name: 'a', version: '1' }, foundInTools: ['Syft'] }]]),
  statistics: { toolCounts: { Syft: 1 }, commonToAll: 1, uniquePerTool: { Syft: 0 } },
};

test('exports JSON and PDF', () => {
  render(<ExportButtons comparison={comp as any} />);
  fireEvent.click(screen.getByText(/Export JSON/));
  expect(URL.createObjectURL).toHaveBeenCalled();
  fireEvent.click(screen.getByText(/Export PDF/));
  expect(alert).toHaveBeenCalled();
});


