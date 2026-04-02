import { render, screen, waitFor } from '@testing-library/react';
import CvePage from './page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/store/useArtifactStore', () => ({ useArtifactStore: () => ({ setSelectedImage: jest.fn() }) }));
jest.mock('@/lib/sbomLoader', () => ({ loadSbomImagesFromPublic: async () => ({ images: [], pagination: { totalPages: 1 } }) }));

describe('CVE Compare page', () => {
  test('shows page title after load', async () => {
    render(<CvePage />);
    await waitFor(() => expect(screen.getByText('Compare CVE reports')).toBeInTheDocument());
  });
});
