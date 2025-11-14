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
      className="mb-8"
    >
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
        />
      </div>
    </motion.div>
  );
};
