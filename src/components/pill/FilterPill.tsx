import React from 'react';
import { cn } from '@/lib/utils';

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  // a tool's color: the pill is drawn in it instead of the primary color
  color?: string;
  children: React.ReactNode;
}

// A toggle in a row of filters: "All", "only syft", "npm (12)"…
export const FilterPill: React.FC<FilterPillProps> = ({ active, onClick, color, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'text-caption px-3 py-1.5 rounded-pill border transition-colors font-medium capitalize',
      !color && (active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground-muted hover:border-primary-fg'),
    )}
    style={color ? (active ? { background: color, borderColor: color, color: 'var(--primary-foreground)' } : { borderColor: color, color: 'var(--foreground-muted)' }) : undefined}
  >
    {children}
  </button>
);
