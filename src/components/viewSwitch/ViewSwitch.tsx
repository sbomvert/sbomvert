type ViewSwitchProps = {
  modes: string[];
  selected: string;
  onChange: (mode: string) => void;
};

export function ViewSwitch({ modes, selected, onChange }: ViewSwitchProps) {
  // input gray, not surface-alt: in the light theme that is the page background, and the switch disappears
  return (
    <div role="group" aria-label="View" className="flex gap-1 bg-input border border-border rounded-card p-1 self-start sm:self-auto">
      {modes.map(mode => (
        <button
          key={mode}
          type="button"
          aria-pressed={selected === mode}
          onClick={() => onChange(mode)}
          className={`px-4 py-1.5 rounded-panel text-body-sm font-medium transition-colors capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            selected === mode
              ? 'bg-surface text-foreground shadow-panel'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
