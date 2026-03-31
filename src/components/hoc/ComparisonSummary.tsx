import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import Heatmap from '@/components/heatmap/HeatMap';
import { computeJaccard } from '@/lib/utils';
import { HorizontalStrip } from '../horizontalStrip/HorizontalStrip';

interface MultiToolSummaryProps {
  comparison: IMultiToolComparison;
}

// Chart tooltip style — uses CSS vars so it adapts to dark mode at runtime
const tooltipStyle = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  color: 'var(--color-foreground)',
};

export const MultiToolSummary: React.FC<MultiToolSummaryProps> = ({ comparison }) => {
  const chartData = comparison.tools.map((tool, idx) => ({
    tool: tool.name,
    total:  comparison.statistics.toolCounts[tool.name],
    unique: comparison.statistics.uniquePerTool[tool.name],
    color:  ['#4f46e5', '#10b981', '#f59e0b'][idx],
  }));

  const radarData = comparison.tools.map(tool => {
    const total  = comparison.statistics.toolCounts[tool.name];
    const unique = comparison.statistics.uniquePerTool[tool.name];
    const common = total - unique;
    return {
      tool: tool.name,
      coverage:   comparison.allPackages.size === 0 ? '0.00' : ((common / comparison.allPackages.size) * 100).toFixed(2),
      uniqueness: ((unique / total) * 100).toFixed(2) || 0,
      total,
    };
  });

  const comparisonMap = {
    'Total packages':          comparison.allPackages.size.toString(),
    'Packages with conflicts': comparison.statistics.packagesWithConflicts.toString(),
    'Common packages':         comparison.statistics.commonToAll.toString(),
  };

  const axisStyle = { stroke: 'var(--color-foreground-subtle)' } as React.CSSProperties;

  return (
    <>
      <HorizontalStrip entries={comparisonMap} />
      <div className="mb-6" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-card shadow-card p-card-p-lg mb-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-heading-sm text-foreground mb-3">Package Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="tool" stroke="var(--color-foreground-subtle)" />
                <YAxis stroke="var(--color-foreground-subtle)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="total"  fill="#4f46e5" name="Total Packages" />
                <Bar dataKey="unique" fill="#f59e0b" name="Unique Packages" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-heading-sm text-foreground mb-3">Tool Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis  dataKey="tool" stroke="var(--color-foreground-subtle)" />
                <PolarRadiusAxis stroke="var(--color-foreground-subtle)" />
                <Radar name="Coverage %"   dataKey="coverage"   stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Radar name="Uniqueness %" dataKey="uniqueness" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                <Legend />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="max-w-full overflow-hidden">
            <h3 className="text-heading-sm text-foreground mb-3">Package similarity across tools</h3>
            <ResponsiveContainer width="100%" height={600}>
              <Heatmap data={computeJaccard(comparison.infoByTool, 'packages')} colorRange={['#e0f7fa', '#006064']} />
            </ResponsiveContainer>
          </div>

          <div className="max-w-full overflow-hidden">
            <h3 className="text-heading-sm text-foreground mb-3">pURL similarity across tools</h3>
            <ResponsiveContainer width="100%" height={600}>
              <Heatmap data={computeJaccard(comparison.infoByTool, 'purls')} colorRange={['#ffebee', '#b71c1c']} />
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </>
  );
};
