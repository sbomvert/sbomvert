import React, { useState, useLayoutEffect, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  toggle: () => void;
}

// Isomorphic layout effect (no SSR warning)
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const useIsMounted = () => {
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, toggle }) => {
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="p-2 rounded-lg"
        style={{ width: 36, height: 36 }}
      />
    );
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
      style={{ width: 36, height: 36 }}
    >
      {isDark ? (
        <Sun size={20} className="text-yellow-400" />
      ) : (
        <Moon size={20} className="text-gray-700 dark:text-gray-300" />
      )}
    </button>
  );
};
