import React from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // the search icon's classes
  iconClassName?: string;
  size?: number
  // the wrapper's classes: its margin and width where it sits
  className?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search container images...',
  iconClassName = "absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground-subtle",
  size = 20,
  className,
  ref,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn('mb-section', className)}
    >
      <div className="relative">
        <Search
          className={iconClassName}
          size={size}
        />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-body-sm rounded-input border border-border bg-surface text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring placeholder:text-foreground-subtle"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
