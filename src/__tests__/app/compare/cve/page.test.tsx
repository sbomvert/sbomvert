import { render, screen } from '@testing-library/react';


import CVEPage from '@/app/compare/cve/page';
import { useArtifactStore } from '@/store/useArtifactStore';
import React from 'react';

jest.mock('@/store/useArtifactStore', () => ({
  useArtifactStore: jest.fn()
}));

jest.mock('@/components/hoc/LoadingSpinner', () => ({
  LoadingSpinner: () => null
}));


jest.mock('@/lib/vuln/vulnLoader', () => ({
  loadCVEsForImage: jest.fn(() => Promise.resolve({ cves: {} }))
}));



describe('CVEPage', () => {
  it('renders heading with selected image', () => {
    (useArtifactStore as jest.Mock).mockReturnValue({ selectedImage: 'my-image' });
    render(<CVEPage />);
    expect(screen.getByText(/CVE Comparison for my-image/)).toBeInTheDocument();
    // Verify summary component renders
    expect(screen.getByText('CVEs per tool')).toBeInTheDocument();
  });
});
