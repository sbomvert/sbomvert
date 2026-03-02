import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  variant?: 'default' | 'error';
}

export const Input: React.FC<InputProps> = ({ className, variant = 'default', ...props }) => {
  const baseStyles =
    'block w-full rounded-md border-0 py-1.5 pl-3 text-gray-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset';

  const variantStyles = {
    default: 'ring-gray-300 focus:ring-indigo-600',
    error: 'ring-red-500 focus:ring-red-600',
  };

  const classes = cn(baseStyles, variantStyles[variant], className);

  return <input className={classes} {...props} />;
};
