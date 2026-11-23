import React from 'react';

interface CardProps {
  entries: Record<string, string>;
  className?: string;
}

export const HorizontalStrip: React.FC<CardProps> = ({ entries, className }) => {
  const entriesArray = Object.entries(entries);

  return (
    <dl
      className={`grid bg-surface rounded-card border border-border shadow-card divide-x divide-border ${className ?? ''}`}
      style={{ gridTemplateColumns: `repeat(${entriesArray.length || 1}, minmax(0, 1fr))` }}
    >
      {entriesArray.map(([k, v]) => (
        <div key={k} className="px-card-p py-4 min-w-0">
          <dt className="text-label text-foreground-subtle uppercase tracking-wider mb-1 truncate">{k}</dt>
          <dd className="text-display text-foreground tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
};
