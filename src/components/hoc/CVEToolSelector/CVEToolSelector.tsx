import { Card } from "@/components/card/Card";

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
    <Card className="border border-border-subtle shadow-panel">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-body-sm font-semibold text-foreground-muted">Tools being compared</h2>
        <span className="text-caption text-foreground-subtle">
          {selectedTools.size} / {allTools.length} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {allTools.map(tool => {
          const active = selectedTools.has(tool);
          const color  = toolColors[tool];
          return (
            <button
              key={tool}
              onClick={() => onToggle(tool)}
              className={`flex items-center gap-2 px-4 py-2 rounded-card text-body-sm font-medium border transition-all capitalize
                ${active ? 'shadow-panel' : 'opacity-40 hover:opacity-70'}`}
              style={
                active
                  ? { borderColor: color, background: `${color}18`, color }
                  : { borderColor: 'var(--color-border)', color: 'var(--color-foreground-subtle)' }
              }
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? color : 'var(--color-border)' }} />
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
        <p className="mt-3 text-caption text-warning-fg">Select at least 2 tools to compare.</p>
      )}
        </Card>
  );
}
