import React from 'react';

interface CardProps {
  entries: Record<string, string>;
  className?: string;
}

export const HorizontalStrip: React.FC<CardProps> = ({ entries, className }) => {
  const entriesArray = Object.entries(entries);
  const nEntries = entriesArray.length;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${nEntries || 1}, minmax(0, 1fr))`,
    alignItems: 'center',
  };

  return (
    <div
      className={`grid bg-surface rounded-card-lg shadow-card border border-border-subtle p-card-p-lg ${className ?? ''}`}
      style={gridStyle}
    >
      {entriesArray.map(([k, v], index) => {
        const isMiddle = index !== 0 && index !== nEntries - 1;
        return (
          <div
            key={k}
            className={`text-center ${isMiddle ? 'border-x border-border-subtle' : ''}`}
          >
            <p className="text-label text-foreground-subtle uppercase tracking-wider mb-1">{k}</p>
            <p className="text-display font-extrabold text-foreground tabular-nums">{v}</p>
          </div>
        );
      })}
    </div>
  );
};
