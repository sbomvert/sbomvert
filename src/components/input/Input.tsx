import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  variant?: 'default' | 'error';
}

export const Input: React.FC<InputProps> = ({ className, variant = 'default', ...props }) => {
  const baseStyles =
    'block w-full h-10 rounded-input border-0 px-3 text-body-sm text-foreground bg-surface shadow-panel ring-1 ring-inset focus:ring-2 focus:ring-inset';

  const variantStyles = {
    default: 'ring-border-field focus:ring-ring',
    error:   'ring-error focus:ring-error',
  };

  return <input className={cn(baseStyles, variantStyles[variant], className)} {...props} />;
};
