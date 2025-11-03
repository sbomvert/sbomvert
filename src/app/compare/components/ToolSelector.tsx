import React from 'react';
import { motion } from 'framer-motion';
import { IToolInfo } from '@/models/ISbom';
import { Check } from 'lucide-react';

interface ToolSelectorProps {
  tools: IToolInfo[];
  selectedTools: Set<string>;
  onToolToggle: (toolName: string) => void;
  colors: string[];
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  tools,
  selectedTools,
  onToolToggle,
  colors,
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold dark:text-white">Tools Being Compared</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Click to toggle tools ({selectedTools.size}/{tools.length} selected)
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tools.map((tool, idx) => {
          const isSelected = selectedTools.has(tool.name);
          return (
            <motion.button
              key={tool.name}
              onClick={() => onToolToggle(tool.name)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-all border-l-4 ${
                isSelected ? '' : 'opacity-50'
              }`}
              style={{ borderLeftColor: colors[idx] }}
            >
              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: colors[idx] }}
                >
                  <Check size={16} />
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${colors[idx]}20` }}>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ color: colors[idx] }}
                    >
                      <path
                        d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 14H4V9h16v10z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold dark:text-white text-left">{tool.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">v{tool.version}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Vendor:</span>
                  <span className="font-medium dark:text-white">{tool.vendor}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Format:</span>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      tool.format === 'SPDX'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}
                  >
                    {tool.format}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};