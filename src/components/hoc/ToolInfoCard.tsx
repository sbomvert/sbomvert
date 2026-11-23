import React from 'react';
import { IToolInfo } from '@/models/ISbom';

interface ToolInfoCardProps {
  toolInfo: IToolInfo;
  color: string;
}

export const ToolInfoCard: React.FC<ToolInfoCardProps> = ({ toolInfo, color }) => {
  const name = toolInfo.name ?? 'Unknown';

  return (
    <div className="bg-surface rounded-card border border-border px-4 py-3 shadow-card">
      {/* the tool's dot: the same colour marks this tool on every chart and table */}
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
        <h3 className="text-body-sm font-medium text-foreground truncate">{name}</h3>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-caption">
        <div className="min-w-0">
          <dt className="text-foreground-subtle">Vendor</dt>
          <dd className="text-foreground truncate">{toolInfo.vendor ?? 'Not reported'}</dd>
        </div>
        <div>
          <dt className="text-foreground-subtle">Version</dt>
          <dd className="font-mono text-foreground">{toolInfo.version ?? 'Not reported'}</dd>
        </div>
        <div>
          <dt className="text-foreground-subtle">Format</dt>
          <dd className="font-mono text-foreground">{toolInfo.format ?? 'Not reported'}</dd>
        </div>
      </dl>
    </div>
  );
};
