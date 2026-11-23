import { labelClass } from '@/components/input/fieldStyles';

interface SegmentedRadioProps<T extends string> {
  name: string;
  legend: string;
  // the legend for screen readers only, when the form already says what the choice is
  hideLegend?: boolean;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// A radio group drawn like the view switch: native radios (keyboard, labels and forms work as usual), hidden,
// with their labels as the segments
export function SegmentedRadio<T extends string>({ name, legend, hideLegend, options, value, onChange }: SegmentedRadioProps<T>) {
  return (
    <fieldset>
      <legend className={hideLegend ? 'sr-only' : labelClass}>{legend}</legend>
      <div className="inline-flex flex-wrap gap-1 bg-input border border-border rounded-card p-1">
        {options.map(option => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`inline-flex items-center h-8 px-3 rounded-md text-body-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                checked ? 'bg-surface text-foreground font-medium shadow-panel' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(option.value)} />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
