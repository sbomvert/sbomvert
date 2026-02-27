import { useState, useEffect } from 'react';

export const useTheme = () => {

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;

    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    return stored === 'dark' || (!stored && prefersDark);
  });

  // Sync DOM + localStorage when state changes
  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return { isDark, toggleTheme };
};