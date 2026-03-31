import React, { useState, useLayoutEffect, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  toggle: () => void;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const useIsMounted = () => {
  const [mounted, setMounted] = useState(false);
  useIsomorphicLayoutEffect(() => { setMounted(true); }, []);
  return mounted;
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, toggle }) => {
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="p-2 rounded-button"
        style={{ width: 36, height: 36 }}
      />
    );
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-button hover:bg-surface-alt transition-colors"
      aria-label="Toggle theme"
      style={{ width: 36, height: 36 }}
    >
      {isDark ? (
        <Sun size={20} className="text-warning" />
      ) : (
        <Moon size={20} className="text-foreground-muted" />
      )}
    </button>
  );
};
