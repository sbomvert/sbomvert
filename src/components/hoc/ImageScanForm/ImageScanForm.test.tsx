import { render, screen, fireEvent } from '@testing-library/react';
import { ImageScanForm } from './ImageScanForm';

// Mock Button component used inside ImageScanForm
jest.mock('@/components/button/Button', () => {
  return { Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ) };
});

// Mock SupportedTools to a simple list for test stability
jest.mock('@sbomvert/core/tools', () => {
  const mockTool = { name: 'trivy', description: '' };
  return {
    SBOM_FORMATS: ['spdx', 'cdx'],
    SupportedTools: { producers: [mockTool], consumers: [mockTool] },
  };
});

describe('ImageScanForm component', () => {
  const onSubmit = jest.fn(() => Promise.resolve());
  const onCancel = jest.fn();

  test('renders input and toggles tool selection', () => {
    render(
      <ImageScanForm onSubmit={onSubmit} onCancel={onCancel} />
    );
    const input = screen.getByPlaceholderText('repo/app:tag');
    fireEvent.change(input, { target: { value: 'myimage:latest' } });
    expect((input as HTMLInputElement).value).toBe('myimage:latest');

  });

  test('submits the chosen formats (both by default)', async () => {
    render(<ImageScanForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByPlaceholderText('repo/app:tag'), { target: { value: 'alpine' } });
    fireEvent.click(screen.getByText('SPDX'));
    fireEvent.click(screen.getByText('Start Scan'));
    expect(onSubmit).toHaveBeenCalledWith(
      'alpine',
      { producers: ['trivy'], consumers: ['trivy'] },
      ['cdx']
    );
  });

  test('calls onCancel when cancel button clicked', () => {
    render(
      <ImageScanForm onSubmit={onSubmit} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
