jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}));


import Home from '@/app/compare/page';

import { render, screen, fireEvent } from '@testing-library/react';


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
    fireEvent.click(button);
    // Fill and submit the scan form
    const input = await screen.findByPlaceholderText('repo/app:tag');
    fireEvent.change(input, { target: { value: 'myimage:latest' } });
    const startButton = screen.getByRole('button', { name: /start scan/i });
    fireEvent.click(startButton);
    // Wait for fetch
    expect(global.fetch).toHaveBeenCalledWith('/api/scan', expect.objectContaining({
      method: 'POST',
    }));
  });
});
