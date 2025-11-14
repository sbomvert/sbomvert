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
      <button
        onClick={() => onViewModeChange('summary')}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          viewMode === 'summary'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        Summary
      </button>
      <button
        onClick={() => onViewModeChange('table')}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          viewMode === 'table'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        Table
      </button>
      <button
        onClick={() => onViewModeChange('chart')}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          viewMode === 'chart'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        Charts
      </button>
    </div>
  );
};
