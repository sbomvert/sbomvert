import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  variant?: 'default' | 'error';
}

export const Input: React.FC<InputProps> = ({ className, variant = 'default', ...props }) => {
  const baseStyles =
    'block w-full rounded-input border-0 py-1.5 pl-3 text-foreground bg-surface shadow-panel ring-1 ring-inset focus:ring-2 focus:ring-inset';

  const variantStyles = {
    default: 'ring-border focus:ring-ring',
    error:   'ring-error focus:ring-error',
  };

  return <input className={cn(baseStyles, variantStyles[variant], className)} {...props} />;
};
