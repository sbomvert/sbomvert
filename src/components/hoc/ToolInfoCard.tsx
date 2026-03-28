import React from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { IToolInfo } from '@/models/ISbom';

interface ToolInfoCardProps {
  toolInfo: IToolInfo;
  color: string;
}

export const ToolInfoCard: React.FC<ToolInfoCardProps> = ({
  toolInfo,
  color,
}) => {
  const name = toolInfo.name ?? 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm border-l-4"
      style={{ borderLeftColor: color }}
    >
      {/* ROW 1: header */}
      <div className="flex items-center gap-2 mb-1 min-w-0">
        <div
          className="p-1.5 rounded-md shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Package size={18} style={{ color }} />
        </div>

        <h3 className="text-sm font-semibold dark:text-white truncate">
          {name}
        </h3>
      </div>

      {/* ROW 2: fixed metadata grid */}
      <div className="grid grid-cols-3 gap-3 text-xs items-center">
        
        {/* Vendor */}
        <div className="min-w-0">
          <span className="text-gray-500 dark:text-gray-400">Vendor</span>
          <div className="font-medium dark:text-white truncate">
            {toolInfo.vendor ?? '—'}
          </div>
        </div>

        {/* Version */}
        <div>
          <span className="text-gray-500 dark:text-gray-400">Version</span>
          <div className="font-medium dark:text-white">
            {toolInfo.version ?? '—'}
          </div>
        </div>

        {/* Format */}
        <div>
          <span className="text-gray-500 dark:text-gray-400">Format</span>
          <div>
            {toolInfo.format ? (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  toolInfo.format === 'SPDX'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}
              >
                {toolInfo.format}
              </span>
            ) : (
              '—'
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
};