import React from 'react';
import { motion } from 'framer-motion';
import { IToolInfo } from '@/models/ISbom';
import { ToolInfoCard } from './ToolInfoCard';
import { toolColor } from '@/lib/utils';

interface ToolSelectorProps {
  tools: IToolInfo[];
  selectedTools: Set<string>;
  onToolToggle: (toolName: string) => void;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  tools,
  selectedTools,
  onToolToggle,
}) => {
  return (
    <div className="mb-section">
      <div className="flex justify-end">
        <p className="text-body-sm text-foreground-muted tabular-nums mb-3">
          {selectedTools.size}/{tools.length} selected
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
        {tools.map(tool => {
          const isSelected = selectedTools.has(tool.name);
          return (
            <motion.button
              key={tool.name + tool.format}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToolToggle(tool.name)}
              whileTap={{ scale: 0.98 }}
              className={`relative block w-full rounded-card text-left transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? '' : 'opacity-50'}`}
            >
              <ToolInfoCard toolInfo={tool} color={toolColor(tool.name)} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
