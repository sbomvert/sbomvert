import React from 'react';
import { cn } from '@/lib/utils';

interface SelectorProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'size'
  > {
  variant?: 'primary' | 'secondary' | 'outline' | 'disabled' | 'unfocused';
  size?: 'sm' | 'md' | 'lg' | 'Sm';
  withHover?: boolean;
  children?: React.ReactNode;
}

export const Selector: React.FC<SelectorProps> = ({
  variant = 'primary',
  size = 'md',
  withHover,
  className,
  children,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded font-medium transition-all';

  const variantStyles = {
    primary:
      'bg-primary text-white focus:ring-indigo-500 shadow-lg ' +
      (withHover ? 'hover:bg-indigo-700' : ''),

    secondary:
      'bg-gray-200 text-gray-900 focus:ring-gray-400 shadow-lg ' +
      (withHover ? 'hover:bg-gray-300' : ''),

    outline:
      'border-2 border-primary text-primary focus:ring-indigo-500 ' +
      (withHover ? 'hover:bg-indigo-50' : ''),

    unfocused:
      'text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 ' +
      (withHover ? 'hover:text-gray-900' : ''),

    disabled:
      'flex items-center bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    Sm: 'px-4 py-2 text-base min-w-24',
    md: 'px-6 py-3 text-base',
    lg: 'px-9 py-6 text-lg',
  };

  const isDisabled = disabled || variant === 'disabled';

  return (
    <div>
      <select
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};