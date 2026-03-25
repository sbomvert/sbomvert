import Home from '@/app/compare/page';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Scan API integration test', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ jobId: 'test-job-id' }),
      } as any)
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('sends scan request and shows job ID', async () => {
    render(<Home />);
    const scanButton = screen.getByRole('button', { name: /scan image/i });
    fireEvent.click(scanButton);
    // Fill out the scan form
    const input = await screen.findByPlaceholderText('repo/app:tag');
    fireEvent.change(input, { target: { value: 'myimage:latest' } });
    const startButton = screen.getByRole('button', { name: /start scan/i });
    fireEvent.click(startButton);
    await new Promise(r => setTimeout(r, 0));
    // Expect fetch to have been called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith('/api/scan', expect.objectContaining({
      method: 'POST',
    }));
  });
});
