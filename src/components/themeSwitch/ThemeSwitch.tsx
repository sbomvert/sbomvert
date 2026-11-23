'use client';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

// An icon button. The icon follows the .dark class, so the server and the browser render the same markup
export function ThemeSwitch({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Switch theme"
      title="Switch theme"
      className={cn(
        'inline-flex items-center justify-center size-9 rounded-md text-foreground-subtle transition-colors hover:bg-surface/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <Moon className="size-4.5 dark:hidden" strokeWidth={1.75} aria-hidden />
      <Sun className="size-4.5 hidden dark:block" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
