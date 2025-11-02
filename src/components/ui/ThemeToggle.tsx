import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  toggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, toggle }) => (
  <button
    onClick={toggle}
    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    aria-label="Toggle theme"
  >
    {isDark ? (
      <Sun size={20} className="text-yellow-400" />
    ) : (
      <Moon size={20} className="text-gray-700" />
    )}
  </button>
);
