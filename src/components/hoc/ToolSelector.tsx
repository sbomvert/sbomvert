import React from 'react';
import { motion } from 'framer-motion';
import { IToolInfo } from '@/models/ISbom';
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-section">
      <div className="flex justify-end">
        <p className="text-body-sm text-foreground-muted mb-4">
          {selectedTools.size}/{tools.length} selected
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
              className={`relative block w-full ${isSelected ? '' : 'opacity-50'}`}
            >
              <ToolInfoCard toolInfo={tool} color={colors[idx]} />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
