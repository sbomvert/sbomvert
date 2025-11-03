import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { ImageSelector } from '@/app/compare/components/ImageSelector';

jest.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} />, button: (p: any) => <button {...p} /> },
}));

test('renders empty state', () => {
  render(<ImageSelector images={[]} onImageSelect={() => {}} />);
  expect(screen.getByText(/No container images found/)).toBeInTheDocument();
});

test('renders images and fires onImageSelect', () => {
  const onImageSelect = jest.fn();
  render(
    <ImageSelector
      images={[{ id: 'nginx:latest', name: 'nginx:latest', description: 'desc', toolCount: 3 }]}
      onImageSelect={onImageSelect}
    />
  );
  fireEvent.click(screen.getByText('nginx:latest'));
  expect(onImageSelect).toHaveBeenCalledWith('nginx:latest');
});


