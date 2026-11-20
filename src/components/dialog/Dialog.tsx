'use client';
import React from 'react';
import { Dialog as DialogRoot, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

// A modal in the app's theme (ui/dialog is styled with shadcn's colors, which globals.css doesn't define)
export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, title, description, className, children }) => (
  <DialogRoot open={open} onOpenChange={next => onOpenChange(next)}>
    <DialogContent className={cn('bg-surface text-foreground ring-border shadow-card p-card-p-lg gap-5 sm:max-w-lg', className)}>
      <div className="flex flex-col gap-1 pr-8">
        <DialogTitle className="text-heading-sm text-foreground">{title}</DialogTitle>
        {description && <DialogDescription className="text-body-sm text-foreground-muted">{description}</DialogDescription>}
      </div>
      {children}
    </DialogContent>
  </DialogRoot>
);
