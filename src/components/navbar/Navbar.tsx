'use client';

import React from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const onLogoClick = () => router.push('/');

  return (
    <nav
      className="shadow-sm border-b transition-colors duration-300 bg-backgroundalt border-border mb-4"
    >
      <div className="mx-auto px-4 px-6">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image src="/logo.svg" width={24} height={24} alt="logo" className="w-8 h-8" />

            <h1 className="text-xl font-bold text-foreground dark:text-white">SBOMVert</h1>
          </button>

          <ThemeToggle isDark={isDark} toggle={toggleTheme} />
        </div>
      </div>
    </nav>
  );
};
