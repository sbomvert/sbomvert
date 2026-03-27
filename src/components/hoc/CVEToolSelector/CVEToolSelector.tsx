export function CVEToolSelector({
  allTools,
  selectedTools,
  toolColors,
  onToggle,
}: {
  allTools: string[];
  selectedTools: Set<string>;
  toolColors: Record<string, string>;
  onToggle: (tool: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Tools being compared
        </h2>
        <span className="text-xs text-gray-400">
          {selectedTools.size} / {allTools.length} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {allTools.map((tool) => {
          const active = selectedTools.has(tool);
          const color = toolColors[tool];
          return (
            <button
              key={tool}
              onClick={() => onToggle(tool)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize
                ${active ? 'shadow-sm' : 'opacity-40 hover:opacity-70'}`}
              style={
                active
                  ? { borderColor: color, background: `${color}18`, color }
                  : { borderColor: '#d1d5db', color: '#9ca3af' }
              }
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: active ? color : '#d1d5db' }}
              />
              {tool}
              {active && (
                <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {selectedTools.size < 2 && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Select at least 2 tools to compare.
        </p>
      )}
    </div>
  );
}