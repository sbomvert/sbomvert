import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  classname? : string
  size?: number
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search container images...',
  classname = "absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground-subtle",
  size = 20
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-section"
    >
      <div className="relative">
        <Search
          className={classname}
          size={size}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-body-sm rounded-input border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-foreground-subtle"
        />
      </div>
    </motion.div>
  );
};
