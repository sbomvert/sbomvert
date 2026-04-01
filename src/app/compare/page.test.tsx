import { render, screen, waitFor } from '@testing-library/react';
import HomePage from './page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/store/useArtifactStore', () => ({ useArtifactStore: () => ({ setSelectedImage: jest.fn() }) }));
jest.mock('@/lib/sbomLoader', () => ({ loadSbomImagesFromPublic: async () => ({ images: [], pagination: { totalPages: 1 } }) }));

describe('Compare Home page', () => {
  test('renders page title', async () => {
    render(<HomePage />);
    await waitFor(() => expect(screen.getByText('Compare artifacts')).toBeInTheDocument());
  });
});
