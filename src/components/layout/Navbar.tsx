import React from 'react';
import { Languages } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface NavbarProps {
  isDark: boolean;
  toggleTheme: () => void;
  onLogoClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isDark, toggleTheme, onLogoClick }) => {
  return (
    <nav
      className={`shadow-sm border-b transition-colors duration-300 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Languages className="text-indigo-600 dark:text-indigo-400" size={32} />
            <h1 className="text-xl font-bold dark:text-white">SBOMVert</h1>
          </button>
          <ThemeToggle isDark={isDark} toggle={toggleTheme} />
        </div>
      </div>
    </nav>
  );
};
