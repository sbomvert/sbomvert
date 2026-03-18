import { render, screen } from '@testing-library/react';


import CVEPage from '@/app/compare/cve/page';
import { useArtifactStore } from '@/store/useArtifactStore';
import React from 'react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}));


describe('CVEPage', () => {
  it('renders heading with selected image', () => {
    (useArtifactStore as jest.Mock).mockReturnValue({ selectedImage: 'my-image' });
    render(<CVEPage />);
    expect(screen.getByText(/CVE Comparison for my-image/)).toBeInTheDocument();
  });
});
