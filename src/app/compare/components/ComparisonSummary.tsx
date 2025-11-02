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
      <h2 className="text-2xl font-bold mb-4 dark:text-white">Multi-Tool Comparison Summary</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="text-purple-600 dark:text-purple-400" size={20} />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Total Unique Packages
            </span>
          </div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {comparison.allPackages.size}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              Common to All
            </span>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {comparison.statistics.commonToAll}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="text-blue-600 dark:text-blue-400" size={20} />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Tools Compared
            </span>
        </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {comparison.tools.length}
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-amber-600 dark:text-amber-400" size={20} />
            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Coverage Variance
            </span>
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {Math.max(...Object.values(comparison.statistics.toolCounts)) -
              Math.min(...Object.values(comparison.statistics.toolCounts))}
          </div>
        </div>
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
      </div>
    </motion.div>
  );
};
