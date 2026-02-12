import { render, screen, fireEvent } from '@/test-utils';
import { ImageSelector } from '@/app/compare/components/ImageSelector';
import { jest, describe, it, expect } from '@jest/globals';

jest.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} />, button: (p: any) => <button {...p} /> },
}));

describe('ImageSelector', () => {
  it('renders empty state', () => {
    render(
      <ImageSelector
        images={[]}
        onImageSelect={() => {}}
        onPageChange={() => {}}
        currentPage={0}
        totalPages={10}
      />
    );
    expect(screen.getByText(/No container images found/i)).not.toBeNull();
  });

  it('renders images and fires onImageSelect', () => {
    const onImageSelect = jest.fn();
    render(
      <ImageSelector
        images={[{ id: 'nginx:latest', name: 'nginx:latest', description: 'desc', sbomCount: 3 }]}
        currentPage={0}
        totalPages={10}
        onPageChange={onImageSelect}
        onImageSelect={onImageSelect}
      />
    );

    // Click the image name
    fireEvent.click(screen.getByText('nginx:latest'));

    expect(onImageSelect).toHaveBeenCalledTimes(1);
    expect(onImageSelect).toHaveBeenCalledWith('nginx:latest');
  });
});
