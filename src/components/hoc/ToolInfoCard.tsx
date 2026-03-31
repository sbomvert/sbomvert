import React from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { IToolInfo } from '@/models/ISbom';

interface ToolInfoCardProps {
  toolInfo: IToolInfo;
  color: string;
}

export const ToolInfoCard: React.FC<ToolInfoCardProps> = ({ toolInfo, color }) => {
  const name = toolInfo.name ?? 'Unknown';

  const formatBadge =
    toolInfo.format === 'SPDX'
      ? 'bg-info-subtle text-info-fg'
      : 'bg-success-subtle text-success-fg';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface rounded-card px-4 py-3 shadow-panel border-l-4"
      style={{ borderLeftColor: color }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 min-w-0">
        <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: `${color}20` }}>
          <Package size={18} style={{ color }} />
        </div>
        <h3 className="text-body-sm font-semibold text-foreground truncate">{name}</h3>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-3 gap-3 text-caption items-center">
        <div className="min-w-0">
          <span className="text-foreground-subtle">Vendor</span>
          <div className="font-medium text-foreground truncate">{toolInfo.vendor ?? '—'}</div>
        </div>
        <div>
          <span className="text-foreground-subtle">Version</span>
          <div className="font-medium text-foreground">{toolInfo.version ?? '—'}</div>
        </div>
        <div>
          <span className="text-foreground-subtle">Format</span>
          <div>
            {toolInfo.format ? (
              <span className={`px-2 py-0.5 rounded-pill text-caption font-medium ${formatBadge}`}>
                {toolInfo.format}
              </span>
            ) : '—'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
