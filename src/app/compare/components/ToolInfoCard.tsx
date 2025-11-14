import React from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { IToolInfo } from '@/models/ISbom';

interface ToolInfoCardProps {
  toolInfo: IToolInfo;
  color: string;
}

export const ToolInfoCard: React.FC<ToolInfoCardProps> = ({ toolInfo, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border-l-4"
    style={{ borderLeftColor: color }}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Package size={24} style={{ color }} />
        </div>
        <div className="text-left overflow-hidden">
          <h3 className="text-xl font-bold dark:text-white h-6">
            {toolInfo.name.length <= 22 ? toolInfo.name : toolInfo.name.slice(0, 22) + '...'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-40">{toolInfo.version}</p>
        </div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Vendor:</span>
        <span className="font-medium dark:text-white">{toolInfo.vendor}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Format:</span>
        <span
          className={`px-2 py-1 rounded-md text-xs font-medium ${
            toolInfo.format === 'SPDX'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          }`}
        >
          {toolInfo.format}
        </span>
      </div>
    </div>
  </motion.div>
);
