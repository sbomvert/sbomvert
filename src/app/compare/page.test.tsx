import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './page';
import { loadSbomImagesFromPublic } from '@/lib/sbomLoader';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/store/useArtifactStore', () => ({ useArtifactStore: () => ({ setSelectedImage: jest.fn() }) }));
// a little delay, as a real fetch has: the page shows its loading state while the list reloads
jest.mock('@/lib/sbomLoader', () => ({
  loadSbomImagesFromPublic: jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ images: [], pagination: { totalPages: 1 } }), 20))),
}));

describe('Compare Home page', () => {
  test('renders page title', async () => {
    render(<HomePage />);
    await waitFor(() => expect(screen.getByText('Compare artifacts')).toBeInTheDocument());
  });

  test('keeps the focus in the search while the debounced search reloads the list', async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    const search = await screen.findByPlaceholderText('Search images');
    await user.type(search, 'alp');
    await waitFor(() => expect(loadSbomImagesFromPublic).toHaveBeenLastCalledWith(1, 'alp'));
    await waitFor(() => expect(screen.queryByText('Loading SBOM files')).not.toBeInTheDocument());
    expect(screen.getByPlaceholderText('Search images')).toBe(search);
    expect(search).toHaveFocus();
  });
});
