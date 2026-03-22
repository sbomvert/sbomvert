import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  toggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, toggle }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
      // Keep a stable size so layout doesn't shift when the icon appears
      style={{ width: 36, height: 36 }}
    >
      {mounted && (
        isDark
          ? <Sun  size={20} className="text-yellow-400" />
          : <Moon size={20} className="text-gray-700 dark:text-gray-300" />
      )}
    </button>
  );
};