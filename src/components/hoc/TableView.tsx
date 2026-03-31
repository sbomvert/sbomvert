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
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filterBtnClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-white'
        : 'bg-surface-alt text-foreground-muted hover:text-foreground'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-card shadow-card p-card-p-lg"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-heading-lg text-foreground">Package Details</h2>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-2 py-1 border border-border rounded-input text-body-sm bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-foreground-subtle"
          />
          <div className="flex gap-2">
            <button onClick={() => setPackageFilter('all')}    className={filterBtnClass(packageFilter === 'all')}>
              All ({comparison.allPackages.size})
            </button>
            <button onClick={() => setPackageFilter('common')} className={filterBtnClass(packageFilter === 'common')}>
              Common ({comparison.statistics.commonToAll})
            </button>
            <button onClick={() => setPackageFilter('unique')} className={filterBtnClass(packageFilter === 'unique')}>
              Unique Only
            </button>
          </div>
        </div>
      </div>
      <PackageDetailsTable comparison={comparison} filter={packageFilter} searchTerm={searchTerm} />
    </motion.div>
  );
};
