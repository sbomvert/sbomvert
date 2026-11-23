import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      {...props}
      className={cn(
        // p-6, not the card token: a caller's p-0 must be able to override it (tailwind-merge does not know the token)
        'bg-surface rounded-card border border-border shadow-card p-6',
        className
      )}
    >
      {children}
    </div>
  );
};