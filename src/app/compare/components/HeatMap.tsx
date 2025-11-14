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

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3
      ? h
          .split('')
          .map(c => c + c)
          .join('')
      : h,
    16
  );
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function interpolateColor(low: string, high: string, t: number) {
  const a = hexToRgb(low);
  const b = hexToRgb(high);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export default function Heatmap({
  data,
  xLabels: xLabelsProp,
  yLabels: yLabelsProp,
  colorRange = ['#e0f7fa', '#006064'],
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
    data.forEach(d => m.set(`${d.x}||${d.y}`, d.value));
    return m;
  }, [data]);

  const values = data.map(d => d.value);
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
        <g transform="translate(100, 20)">
          {/* Calculate available space */}
          {(() => {
            const availableWidth = dimensions.width - 140;
            const availableHeight = dimensions.height - 100;

            // Calculate cell size to maintain squares
            const cellSize = Math.min(
              availableWidth / xLabels.length,
              availableHeight / yLabels.length
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
                    const fill = interpolateColor(colorRange[0], colorRange[1], t);

                    return (
                      <rect
                        key={`${xLabel}-${yLabel}`}
                        x={xi * cellWidth}
                        y={yi * cellHeight}
                        width={cellWidth}
                        height={cellHeight}
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={0.5}
                        className="heatmap-cell"
                        onMouseEnter={e => {
                          const svgRect = containerRef.current?.getBoundingClientRect();
                          const cellRect = e.currentTarget.getBoundingClientRect();
                          if (svgRect) {
                            setTooltip({
                              active: true,
                              x: cellRect.left - svgRect.left + cellRect.width / 2,
                              y: cellRect.top - svgRect.top - 10,
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
                  stroke="#333"
                  strokeWidth={1.5}
                />

                {/* X-axis labels */}
                {xLabels.map((label, i) => (
                  <text
                    key={`x-${i}`}
                    x={i * cellWidth + cellWidth / 2}
                    y={cellHeight * yLabels.length + 20}
                    textAnchor="middle"
                    fontSize={12}
                    transform={`rotate(-45, ${i * cellWidth + cellWidth / 2}, ${cellHeight * yLabels.length + 20})`}
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
                    dominantBaseline="middle"
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
          className="absolute bg-white border border-gray-300 rounded shadow-lg p-2 text-sm pointer-events-none z-50"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold">
            {tooltip.xLabel} / {tooltip.yLabel}
          </div>
          <div className="text-gray-600">Value: {tooltip.value}</div>
        </div>
      )}
    </div>
  );
}
