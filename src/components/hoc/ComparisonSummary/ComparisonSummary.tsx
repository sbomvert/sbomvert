import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import Heatmap from '@/components/heatmap/HeatMap';
import { computeJaccard, toolColor } from '@/lib/utils';
import { HorizontalStrip } from '@/components/horizontalStrip/HorizontalStrip';

interface MultiToolSummaryProps {
  comparison: IMultiToolComparison;
}

// Chart tooltip style — uses CSS vars so it adapts to dark mode at runtime
const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--foreground)',
};

const axisTick = { fontSize: 12, fill: 'var(--foreground-subtle)', fontFamily: 'var(--font-mono)' };

export const MultiToolSummary: React.FC<MultiToolSummaryProps> = ({ comparison }) => {
  const all = comparison.allPackages.size;
  const rows = comparison.tools.map(tool => {
    const total  = comparison.statistics.toolCounts[tool.name];
    const unique = comparison.statistics.uniquePerTool[tool.name];
    return {
      tool: tool.name,
      total,
      unique,
      // share of all packages that this tool found and at least one other tool found too
      coverage: all === 0 ? 0 : ((total - unique) / all) * 100,
      color: toolColor(tool.name),
    };
  });
  const byCoverage = [...rows].sort((a, b) => b.coverage - a.coverage);

  const comparisonMap = {
    'Total packages':          all.toString(),
    'Packages with conflicts': comparison.statistics.packagesWithConflicts.toString(),
    'Common packages':         comparison.statistics.commonToAll.toString(),
  };

  return (
    <>
      <HorizontalStrip entries={comparisonMap} className="mb-6" />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* the main chart: each tool's bar in its own colour, the packages only it found in a neutral step */}
          <section className="lg:col-span-2 flex flex-col bg-surface rounded-card border border-border shadow-card p-card-p-lg min-w-0">
            <h3 className="text-heading-sm text-foreground mb-4">Package distribution</h3>
            <div className="flex-1 min-h-85">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ bottom: 20, left: 48 }} barGap={2}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="tool" interval={0} angle={-30} textAnchor="end" height={90} tick={axisTick} stroke="var(--border)" />
                <YAxis tick={axisTick} stroke="var(--border)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--foreground-muted)' }} />
                <Bar dataKey="total" name="Total packages" radius={[4, 4, 0, 0]} fill="var(--foreground-muted)">
                  {rows.map(r => <Cell key={r.tool} fill={r.color} />)}
                </Bar>
                <Bar dataKey="unique" name="Only this tool" radius={[4, 4, 0, 0]} fill="var(--foreground-subtle)" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </section>

          {/* a ranked list, not a second chart */}
          <section className="bg-surface rounded-card border border-border shadow-card p-card-p-lg min-w-0">
            <h3 className="text-heading-sm text-foreground mb-1">Coverage by tool</h3>
            <p className="text-caption text-foreground-subtle mb-4">Packages found by this tool and at least one other, out of {all}</p>
            <ol className="space-y-3">
              {byCoverage.map(r => (
                <li key={r.tool}>
                  <div className="flex items-center gap-2 text-body-sm">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} aria-hidden />
                    <span className="truncate text-foreground">{r.tool}</span>
                    <span className="ml-auto font-mono text-caption text-foreground-muted tabular-nums">{r.coverage.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.coverage}%`, backgroundColor: r.color }} />
                  </div>
                  {r.unique > 0 && (
                    <p className="mt-1 text-caption text-foreground-subtle tabular-nums">{r.unique} only in this tool</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-surface rounded-card border border-border shadow-card p-card-p-lg max-w-full overflow-hidden">
            <h3 className="text-heading-sm text-foreground mb-4">Package similarity across tools</h3>
            <ResponsiveContainer width="100%" height={520}>
              <Heatmap data={computeJaccard(comparison.infoByTool, 'packages')} />
            </ResponsiveContainer>
          </section>

          <section className="bg-surface rounded-card border border-border shadow-card p-card-p-lg max-w-full overflow-hidden">
            <h3 className="text-heading-sm text-foreground mb-4">pURL similarity across tools</h3>
            <ResponsiveContainer width="100%" height={520}>
              <Heatmap data={computeJaccard(comparison.infoByTool, 'purls')} />
            </ResponsiveContainer>
          </section>
        </div>
      </motion.div>
    </>
  );
};
