import React from "react";

interface CardProps {
  entries: Record<string, string>;
  className?: string;
}

export const HorizontalStrip: React.FC<CardProps> = ({ entries, className }) => {
  const entriesArray = Object.entries(entries);
  const nEntries = entriesArray.length;

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${nEntries || 1}, minmax(0, 1fr))`,
    alignItems: "center",
  };

  return (
    <div
      className={`grid bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 ${className ?? ""}`}
      style={gridStyle}
    >
      {entriesArray.map(([k, v], index) => {
        const isMiddle = index !== 0 && index !== nEntries - 1;

        const cellClass = [
          "text-center",
          isMiddle ? "border-x border-gray-100 dark:border-gray-700" : "",
        ].join(" ");

        return (
          <div key={k} className={cellClass}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {k}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
              {v}
            </p>
          </div>
        );
      })}
    </div>
  );
};