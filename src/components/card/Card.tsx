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
        'bg-surface rounded-card-lg shadow-card p-card-p-lg transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
};