import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { PackageDetailsTable } from './PackageDetailsTable';

type PackageFilter = 'all' | 'common' | 'unique';

interface TableViewProps {
  comparison: IMultiToolComparison;
}

export const TableView: React.FC<TableViewProps> = ({ comparison }) => {
  const [packageFilter, setPackageFilter] = useState<PackageFilter>('all');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold dark:text-white">Package Details</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPackageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              packageFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All ({comparison.allPackages.size})
          </button>
          <button
            onClick={() => setPackageFilter('common')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              packageFilter === 'common'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Common ({comparison.statistics.commonToAll})
          </button>
          <button
            onClick={() => setPackageFilter('unique')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              packageFilter === 'unique'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Unique Only
          </button>
        </div>
      </div>
      <PackageDetailsTable comparison={comparison} filter={packageFilter} />
    </motion.div>
  );
};