'use client';

import React from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const onLogoClick = () => router.push('/');

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
            <img src="/logo.svg" alt="logo" className="w-8 h-8" />

            <h1 className="text-xl font-bold text-foreground dark:text-white">SBOMVert</h1>
          </button>

          <ThemeToggle isDark={isDark} toggle={toggleTheme} />
        </div>
      </div>
    </nav>
  );
};
