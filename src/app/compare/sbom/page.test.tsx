import { render, screen, waitFor } from '@testing-library/react';
import SbomPage from './page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/store/useArtifactStore', () => ({ useArtifactStore: () => ({ setSelectedImage: jest.fn() }) }));
jest.mock('@/lib/sbomLoader', () => ({ loadSbomImagesFromPublic: async () => ({ images: [], pagination: { totalPages: 1 } }) }));

describe('SBOM Compare page', () => {
  test('renders title after data load', async () => {
    render(<SbomPage />);
    await waitFor(() => expect(screen.getByText('Compare SBOMs')).toBeInTheDocument());
  });
});
