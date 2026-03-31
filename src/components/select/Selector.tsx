import React from 'react';
import { cn } from '@/lib/utils';

interface SelectorProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
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
    'inline-flex items-center justify-center gap-2 rounded-button font-semibold transition-all';

  const variantStyles = {
    primary:
      'bg-primary text-white focus:ring-ring shadow-button ' +
      (withHover ? 'hover:bg-primary-hover' : ''),

    secondary:
      'bg-input text-foreground focus:ring-ring shadow-button ' +
      (withHover ? 'hover:bg-border' : ''),

    outline:
      'border-2 border-primary text-primary focus:ring-ring ' +
      (withHover ? 'hover:bg-info-subtle' : ''),

    unfocused:
      'text-foreground-muted ' +
      (withHover ? 'hover:text-foreground' : ''),

    disabled:
      'flex items-center bg-input text-foreground-subtle cursor-not-allowed',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-body-sm',
    Sm: 'px-4 py-2 text-body min-w-24',
    md: 'px-6 py-3 text-body',
    lg: 'px-9 py-6 text-lg',
  };

  const isDisabled = disabled || variant === 'disabled';

  return (
    <div>
      <select
        disabled={isDisabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};
