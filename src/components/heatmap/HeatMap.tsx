import React, { useMemo } from 'react';

export type HeatmapDatum = {
  x: string;
  y: string;
  value: number;
};

export type HeatmapProps = {
  data: HeatmapDatum[];
  xLabels?: string[];
  yLabels?: string[];
  colorRange?: [string, string];
  width?: number | string;
  height?: number;
};

// color-mix instead of interpolating hex in JS: the ends can be theme tokens (`var(--primary)`)
const mixColor = (low: string, high: string, t: number) =>
  `color-mix(in oklab, ${high} ${Math.round(t * 100)}%, ${low})`;

export default function Heatmap({
  data,
  xLabels: xLabelsProp,
  yLabels: yLabelsProp,
  colorRange = ['var(--surface-alt)', 'var(--primary)'],
  width,
  height,
}: HeatmapProps) {
  const xLabels = useMemo(
    () => xLabelsProp ?? Array.from(new Set(data.map(d => d.x))),
    [data, xLabelsProp]
  );
  const yLabels = useMemo(
    () => yLabelsProp ?? Array.from(new Set(data.map(d => d.y))),
    [data, yLabelsProp]
  );
  const lookup = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach(d => m.set(`${d.x}||${d.y}`, Math.round(d.value * 100)));
    return m;
  }, [data]);

  const values = data.map(d => Math.round(d.value * 100));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 400 });

  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const [tooltip, setTooltip] = React.useState<any>(null);

  // Room for the labels (14px text, ~7.5px per char): y labels sit left of the grid, x labels
  // hang below it rotated 45deg, so they take ~0.71 of their length in height.
  const longest = (labels: string[]) => Math.max(0, ...labels.map(l => l.length)) * 7.5;
  const marginLeft = Math.max(100, longest(yLabels) + 20);
  const marginBottom = Math.max(100, longest(xLabels) * 0.71 + 50);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ width: width || '100%', height: height || '100%' }}
    >
      <svg width="100%" height="100%" className="overflow-visible">
        <defs>
          <style>{`
            .heatmap-cell { cursor: pointer; }
            .heatmap-cell:hover { opacity: 0.8; }
          `}</style>
        </defs>

        {/* Main group with margins */}
        <g transform={`translate(${marginLeft}, 20)`}>
          {/* Calculate available space */}
          {(() => {
            const availableWidth = dimensions.width - marginLeft - 40;
            const availableHeight = dimensions.height - marginBottom;

            // Calculate cell size to maintain squares
            const cellSize = Math.max(
              24,
              Math.min(availableWidth / xLabels.length, availableHeight / yLabels.length)
            );
            const cellWidth = cellSize;
            const cellHeight = cellSize;

            return (
              <>
                {/* Heatmap cells */}
                {yLabels.map((yLabel, yi) =>
                  xLabels.map((xLabel, xi) => {
                    const val = lookup.get(`${xLabel}||${yLabel}`) ?? 0;
                    const t = Math.max(0, Math.min(1, (val - min) / range));
                    const fill = mixColor(colorRange[0], colorRange[1], t);

                    return (
                      <rect
                        key={`${xLabel}-${yLabel}`}
                        x={xi * cellWidth}
                        y={yi * cellHeight}
                        width={cellWidth}
                        height={cellHeight}
                        style={{ fill }}
                        stroke="var(--surface)"
                        strokeWidth={0.5}
                        className="heatmap-cell"
                        onMouseEnter={e => {
                          const svgRect = containerRef.current?.getBoundingClientRect();
                          const cellRect = e.currentTarget.getBoundingClientRect();
                          if (svgRect) {
                            const baseX = cellRect.left - svgRect.left + cellRect.width / 2;
                            const baseY = cellRect.top - svgRect.top - 10;

                            // Estimate tooltip width (adjust as needed)
                            const tooltipWidth = 200;
                            const tooltipHeight = 60;

                            // Adjust X if it would overflow right
                            let adjustedX = baseX;
                            if (baseX + tooltipWidth / 2 > dimensions.width) {
                              adjustedX = dimensions.width - tooltipWidth - 10;
                            } else if (baseX - tooltipWidth / 2 < 0) {
                              adjustedX = tooltipWidth / 2 + 10;
                            }

                            // Adjust Y if it would overflow top
                            let adjustedY = baseY;
                            if (baseY - tooltipHeight < 0) {
                              adjustedY = cellRect.bottom - svgRect.top + 10; // Show below instead
                            }

                            setTooltip({
                              active: true,
                              x: adjustedX,
                              y: adjustedY,
                              xLabel,
                              yLabel,
                              value: val,
                            });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })
                )}

                {/* Border box around heatmap */}
                <rect
                  x={0}
                  y={0}
                  width={cellWidth * xLabels.length}
                  height={cellHeight * yLabels.length}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={1}
                />

                {/* X-axis labels */}
                {xLabels.map((label, i) => (
                  // each label ends just under its column and runs down-left, so it never covers the grid
                  <text
                    key={`x-${i}`}
                    x={i * cellWidth + cellWidth / 2}
                    y={cellHeight * yLabels.length + 12}
                    textAnchor="end"
                    fontSize={12}
                    fill="var(--foreground-subtle)"
                    transform={`rotate(-45, ${i * cellWidth + cellWidth / 2}, ${cellHeight * yLabels.length + 12})`}
                  >
                    {label}
                  </text>
                ))}

                {/* Y-axis labels */}
                {yLabels.map((label, i) => (
                  <text
                    key={`y-${i}`}
                    x={-10}
                    y={i * cellHeight + cellHeight / 2}
                    textAnchor="end"
                    fill="var(--foreground-subtle)"
                    fontSize={12}
                  >
                    {label}
                  </text>
                ))}
              </>
            );
          })()}
        </g>
      </svg>

      {tooltip && tooltip.active && (
        <div
          className="absolute bg-popover text-popover-foreground border border-border rounded shadow-lg p-2 text-body-sm pointer-events-none z-50"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-medium text-foreground">
            {tooltip.xLabel} / {tooltip.yLabel}
          </div>
          <div className="text-foreground-muted">Value: {tooltip.value}%</div>
        </div>
      )}
    </div>
  );
}
