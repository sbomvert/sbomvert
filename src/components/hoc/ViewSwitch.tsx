import React from 'react';

type ViewSwitchProps = {
  /** List of mode identifiers, e.g. ['summary', 'table'] */
  modes: string[];
  /** Currently selected mode */
  selected: string;
  /** Callback invoked when a mode button is clicked */
  onChange: (mode: string) => void;
};

export function ViewSwitch({ modes, selected, onChange }: ViewSwitchProps) {
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 self-start sm:self-auto">
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
            ${selected === mode
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
