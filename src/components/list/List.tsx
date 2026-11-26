// components/List/List.tsx
'use client';

import { FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';


interface ListProps<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  labelClassName?: string;
}

export function List<T>({
  items,
  getId,
  getLabel,
  onSelect,
  labelClassName = 'capitalize',
}: ListProps<T>) {
  return (
    <div className="divide-y divide-border-subtle">
      {items.map((item) => (
        <button
          key={getId(item)}
          onClick={() => onSelect(item)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-info-subtle transition-colors group text-left"
        >
          <div className="flex items-center gap-3">
            <FileText
              size={14}
              className="text-foreground-subtle group-hover:text-info-fg transition-colors"
            />
            <span className={cn('text-body-sm text-foreground font-medium', labelClassName)}>
              {getLabel(item)}
            </span>
          </div>

          <ChevronRight
            size={14}
            className="text-foreground-subtle group-hover:text-info-fg transition-colors"
          />
        </button>
      ))}
    </div>
  );
}