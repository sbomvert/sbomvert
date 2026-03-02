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
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('myimage:latest');
    const button = screen.getByRole('button', { name: /scan image/i });
    fireEvent.click(button);
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    await new Promise(r => setTimeout(r, 0));
    expect(alertSpy).toHaveBeenCalledWith('Scan started. Job ID: test-job-id');
    promptSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
