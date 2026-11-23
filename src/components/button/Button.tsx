import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline-solid' | 'disabled' | 'unfocused';
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
    'inline-flex items-center justify-center gap-2 rounded-button font-medium transition-[color,background-color,border-color,transform] active:scale-[0.98] disabled:active:scale-100';

  const variantStyles = {
    primary:
      'border border-primary bg-primary text-primary-foreground focus:ring-ring ' +
      (withHover ? 'hover:bg-primary-hover' : ''),

    secondary:
      'border border-border bg-surface text-foreground focus:ring-ring ' +
      (withHover ? 'hover:bg-muted' : ''),

    "outline-solid":
      'border border-primary-fg text-primary-fg focus:ring-ring ' +
      (withHover ? 'hover:bg-info-subtle' : ''),

    unfocused:
      'border border-border bg-surface text-foreground-muted ' +
      (withHover ? 'hover:text-foreground hover:bg-muted' : ''),

    disabled:
      'flex items-center bg-input text-foreground-subtle cursor-not-allowed',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-body-sm',
    Sm: 'px-4 py-2 min-w-24',
    md: 'h-10 px-4 text-body-sm',
    lg: 'h-12 px-5 text-body',
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
