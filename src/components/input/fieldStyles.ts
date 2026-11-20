import { cn } from '@/lib/utils';

// The look of a form's fields, shared so the forms can't drift apart
export const labelClass = 'block text-body-sm font-medium text-foreground-muted mb-1';
export const fieldClass = 'w-full rounded-input border border-border px-3 py-2 text-body-sm bg-surface text-foreground disabled:opacity-60';
// a Selector as a form field
export const fieldSelectorClass = cn(fieldClass, 'font-normal shadow-none');
