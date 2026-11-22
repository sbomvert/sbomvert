'use client';
import React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { ChevronDownIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface SelectorOption {
  value: string;
  label: React.ReactNode;
}

interface SelectorProps {
  options: SelectorOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  placeholder?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline-solid' | 'disabled' | 'unfocused';
  size?: 'sm' | 'md' | 'lg' | 'Sm';
  withHover?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

// A select with a themed popup: the native one opens the OS menu, which CSS cannot style
export const Selector: React.FC<SelectorProps> = ({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  variant = 'primary',
  size = 'md',
  withHover,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}) => {
  const baseStyles =
    'inline-flex items-center justify-between gap-2 rounded-button font-semibold transition-all outline-none focus-visible:ring-2';

  const variantStyles = {
    primary:
      'bg-primary text-primary-foreground focus-visible:ring-ring shadow-button ' +
      (withHover ? 'hover:bg-primary-hover' : ''),

    secondary:
      'bg-input text-foreground focus-visible:ring-ring shadow-button ' +
      (withHover ? 'hover:bg-border' : ''),

    "outline-solid":
      'border-2 border-primary-fg text-primary-fg focus-visible:ring-ring ' +
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
    <Select
      items={options}
      value={value}
      defaultValue={defaultValue}
      onValueChange={next => next !== null && onValueChange?.(next)}
      disabled={isDisabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], 'disabled:cursor-not-allowed', className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <ChevronDownIcon size={16} className="shrink-0 opacity-80" aria-hidden />
      </SelectPrimitive.Trigger>
      <SelectContent className="bg-surface text-foreground ring-border" alignItemWithTrigger={false}>
        {options.map(o => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="py-2 text-body-sm focus:bg-info-subtle focus:text-foreground data-highlighted:bg-info-subtle data-highlighted:text-foreground"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
