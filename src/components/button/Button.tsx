import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'disabled' | 'unfocused';
  size?: 'sm' | 'md' | 'lg' | 'Sm';
  withHover?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  withHover,
  className,
  children = undefined,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-button font-semibold transition-all';

  const variantStyles = {
    primary:
      'border-2 border-primary bg-primary text-white focus:ring-ring shadow-button ' +
      (withHover ? 'hover:bg-primary-hover' : ''),

    secondary:
      'border-2 border-input bg-input text-foreground focus:ring-ring shadow-button ' +
      (withHover ? 'hover:bg-border' : ''),

    outline:
      'border-2 border-primary text-primary focus:ring-ring ' +
      (withHover ? 'hover:bg-info-subtle' : ''),

    unfocused:
      'border-2 border-primary text-foreground-muted ' +
      (withHover ? 'hover:text-foreground' : ''),

    disabled:
      'flex items-center bg-input text-foreground-subtle cursor-not-allowed',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    Sm: 'px-4 py-2 min-w-24',
    md: 'px-6 py-3',
    lg: 'px-9 py-6 text-lg',
  };

  return (
    <div className="">
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    </div>
  );
};
