import { render, screen, fireEvent } from '@testing-library/react';
import Home from '@/app/compare/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Compare page scan button', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: 'test-job' }),
      } as any)
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders Scan Image button and starts a scan', async () => {
    render(<Home />);
    const button = screen.getByRole('button', { name: /scan image/i });
    expect(button).toBeInTheDocument();
    // Mock prompt
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('myimage:latest');
    fireEvent.click(button);
    // Wait for fetch to be called
    expect(global.fetch).toHaveBeenCalledWith('/api/scan', expect.objectContaining({
      method: 'POST',
    }));
    promptSpy.mockRestore();
  });
});
