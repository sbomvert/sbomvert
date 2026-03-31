import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'bg-surface rounded-card-lg shadow-card p-card-p-lg transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
};
