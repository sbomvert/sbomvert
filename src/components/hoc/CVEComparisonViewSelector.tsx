import { Button } from '@/components/button/Button';
import React from 'react';

type ViewMode = 'summary' | 'table' | 'chart';

interface CVEComparisonViewSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const CVEComparisonViewSelector: React.FC<CVEComparisonViewSelectorProps> = ({
  viewMode,
  onViewModeChange,
}) => (
  <div className="flex gap-2 bg-surface rounded-card p-1 shadow-panel">
    <Button onClick={() => onViewModeChange('summary')} size="sm" variant={viewMode === 'summary' ? 'primary' : 'unfocused'}>
      Summary
    </Button>
    <Button onClick={() => onViewModeChange('table')}   size="sm" variant={viewMode === 'table'   ? 'primary' : 'unfocused'}>
      Table
    </Button>
  </div>
);
