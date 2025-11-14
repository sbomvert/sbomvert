import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '@/hooks/useFileUpload';

const makeFile = (type = 'application/json', size = 1024) =>
  new File([new Uint8Array(size)], 'a.json', { type });

describe('useFileUpload', () => {
  it('accepts valid file', () => {
    const { result } = renderHook(() => useFileUpload());
    const input = { target: { files: [makeFile()] } } as any;
    act(() => result.current.handleFileUpload(input));
    expect(result.current.error).toBeNull();
    expect(result.current.file).not.toBeNull();
  });

  it('rejects invalid type', () => {
    const { result } = renderHook(() => useFileUpload());
    const input = { target: { files: [makeFile('text/plain')] } } as any;
    act(() => result.current.handleFileUpload(input));
    expect(result.current.error).toMatch('Invalid file type');
  });

  it('rejects too large', () => {
    const { result } = renderHook(() => useFileUpload());
    const input = { target: { files: [makeFile('application/json', 11 * 1024 * 1024)] } } as any;
    act(() => result.current.handleFileUpload(input));
    expect(result.current.error).toMatch('File size too large');
  });

  it('clears file and error', () => {
    const { result } = renderHook(() => useFileUpload());
    act(() => {
      result.current.clearFile();
    });
    expect(result.current.file).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
