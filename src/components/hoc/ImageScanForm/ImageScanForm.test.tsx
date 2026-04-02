import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageScanForm } from './ImageScanForm';

// Mock Button component used inside ImageScanForm
jest.mock('@/components/button/Button', () => {
  return { Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ) };
});

// Mock SupportedTools to a simple list for test stability
jest.mock('@/lib/sbom/tools', () => {
  const mockTool = { name: 'trivy', description: '' };
  return { SupportedTools: { producers: [mockTool], consumers: [mockTool] } };
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

  test('calls onCancel when cancel button clicked', () => {
    render(
      <ImageScanForm onSubmit={onSubmit} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
