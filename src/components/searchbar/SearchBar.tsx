import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search container images...',
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
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground-subtle"
          size={20}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-input border border-border bg-surface text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none placeholder:text-foreground-subtle"
        />
      </div>
    </motion.div>
  );
};
