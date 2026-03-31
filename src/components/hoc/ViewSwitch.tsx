type ViewSwitchProps = {
  modes: string[];
  selected: string;
  onChange: (mode: string) => void;
};

export function ViewSwitch({ modes, selected, onChange }: ViewSwitchProps) {
  return (
    <div className="flex gap-1 bg-surface-alt rounded-card p-1 self-start sm:self-auto">
      {modes.map(mode => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-4 py-1.5 rounded-panel text-body-sm font-medium transition-all capitalize ${
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
