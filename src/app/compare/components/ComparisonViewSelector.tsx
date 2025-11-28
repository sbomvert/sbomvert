import { Button } from '@/components/ui/Button';
import React from 'react';

type ViewMode = 'summary' | 'table' | 'chart';

interface ComparisonViewSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ComparisonViewSelector: React.FC<ComparisonViewSelectorProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
      <Button
        onClick={() => onViewModeChange('summary')}
        size="sm"
        variant={viewMode === 'summary' ? 'primary' : 'unfocused'}
      >
        Summary
      </Button>
      <Button
        onClick={() => onViewModeChange('table')}
        size="sm"
        variant={viewMode === 'table' ? 'primary' : 'unfocused'}
      >
        Table
      </Button>
    </div>
  );
};
