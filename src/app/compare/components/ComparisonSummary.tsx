import React from 'react';
import { motion } from 'framer-motion';
import { Package, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { IMultiToolComparison } from '@/models/IComparisonResult';

import Heatmap from './HeatMap';
interface MultiToolSummaryProps {
  comparison: IMultiToolComparison;
}

export const MultiToolSummary: React.FC<MultiToolSummaryProps> = ({ comparison }) => {
  const chartData = comparison.tools.map((tool, idx) => ({
    tool: tool.name,
    total: comparison.statistics.toolCounts[tool.name],
    unique: comparison.statistics.uniquePerTool[tool.name],
    color: ['#4f46e5', '#10b981', '#f59e0b'][idx],
  }));

  const radarData = comparison.tools.map((tool, idx) => {
    const total = comparison.statistics.toolCounts[tool.name];
    const unique = comparison.statistics.uniquePerTool[tool.name];
    const common = total - unique;

    return {
      tool: tool.name,
      coverage: (common / comparison.allPackages.size) * 100,
      uniqueness: (unique / total) * 100 || 0,
      total: total,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
    >
      <h2 className="text-2xl font-bold mb-4 dark:text-white">Comparison Summary</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-6">
        {/* Existing Cards Here */}
        {/* ... */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Package Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="tool" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="total" fill="#4f46e5" name="Total Packages" />
              <Bar dataKey="unique" fill="#f59e0b" name="Unique Packages" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Tool Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="tool" stroke="#9ca3af" />
              <PolarRadiusAxis stroke="#9ca3af" />
              <Radar
                name="Coverage %"
                dataKey="coverage"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Radar
                name="Uniqueness %"
                dataKey="uniqueness"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.6}
              />
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {/*
        <div className="max-w-full overflow-hidden">
          <h3 className="text-lg font-semibold mb-3 dark:text-white">HeatMap</h3>
          <ResponsiveContainer width="100%" height={600}>
            <Heatmap
            data={[]}
          colorRange={["#e0f7fa", "#006064"]}
      />
          </ResponsiveContainer>
        </div>*/}
      </div>
    </motion.div>
  );
};
