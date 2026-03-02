import React from 'react';
import { motion } from 'framer-motion';
import { IToolInfo } from '@/models/ISbom';
//import { Check } from 'lucide-react';
import { ToolInfoCard } from './ToolInfoCard';

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {tools.map((tool, idx) => {
          const isSelected = selectedTools.has(tool.name);
          return (
            <motion.button
              key={tool.name}
              onClick={() => onToolToggle(tool.name)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative block w-full  ${isSelected ? '' : 'opacity-50'}`}
            >
              {/*isSelected && (
                <div
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: colors[idx] }}
                >
                  <Check size={16} />
                </div>
              )*/}
              <ToolInfoCard toolInfo={tool} color={colors[idx]} />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
