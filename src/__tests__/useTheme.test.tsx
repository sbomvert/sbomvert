import { renderHook, act } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';

const matchMediaMock = (matches: boolean) => () => ({
  matches,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe('useTheme', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaMock(false) });
    Storage.prototype.getItem = jest.fn(() => null) as any;
    Storage.prototype.setItem = jest.fn() as any;
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '' as any;
  });

  it('initializes from system preference', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaMock(true) });
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(true);
  });

  it('toggles updates DOM and localStorage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });
});


