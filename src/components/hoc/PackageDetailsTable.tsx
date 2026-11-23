import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { PackageMetadataDetails } from './PackageMetadataDetails';
import { PackageTypeBadge } from './PackageTypeBadge';
import { toolColor } from '@/lib/utils';

interface PackageDetailsTableProps {
  comparison: IMultiToolComparison;
  filter: string;
  searchTerm?: string;
}

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
};

export const PackageDetailsTable: React.FC<PackageDetailsTableProps> = ({
  comparison,
  filter,
  searchTerm,
}) => {
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredPackages = useMemo(() => {
    const packages = Array.from(comparison.allPackages.entries());
    let filtered = packages;
    switch (filter) {
      case 'common': filtered = filtered.filter(([, pkg]) => pkg.foundInTools.length === comparison.tools.length); break;
      case 'unique': filtered = filtered.filter(([, pkg]) => pkg.foundInTools.length === 1); break;
    }
    if (searchTerm?.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(([, pkg]) => (pkg.name || '').toLowerCase().includes(term));
    }
    return filtered;
  }, [comparison, filter, searchTerm]);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  };

  const sortedPackages = useMemo(() => {
    return [...filteredPackages].sort((a, b) => {
      const pkgA = a[1], pkgB = b[1];
      let vA: any, vB: any;
      if (sortKey === 'name')    { vA = (pkgA.name || '').toLowerCase();        vB = (pkgB.name || '').toLowerCase(); }
      else if (sortKey === 'type')    { vA = (pkgA.packageType || '').toLowerCase(); vB = (pkgB.packageType || '').toLowerCase(); }
      else if (sortKey === 'version') { vA = (pkgA.version || '').toLowerCase();     vB = (pkgB.version || '').toLowerCase(); }
      else if (sortKey === 'foundIn') { vA = pkgA.foundInTools.length;               vB = pkgB.foundInTools.length; }
      else { vA = ''; vB = ''; }
      if (vA < vB) return sortDirection === 'asc' ? -1 : 1;
      if (vA > vB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPackages, sortKey, sortDirection]);

  const thClass = 'text-left py-3 px-4 font-semibold text-foreground';
  // a sortable column: the header is a button, and the column says how it is sorted
  // (a function, not a component: a component defined here would remount on every sort and lose focus)
  const sortableTh = (sortBy: string, className: string, children: React.ReactNode) => {
    const sorted = sortKey === sortBy;
    return (
      <th className={`${thClass} ${className}`} aria-sort={sorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => handleSort(sortBy)} className="font-semibold rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {children}
          {sorted && <span aria-hidden>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>}
        </button>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-border">
            {sortableTh('name',    'w-1/4', 'Package')}
            {sortableTh('type',    'w-32',  'Type')}
            {sortableTh('version', 'w-32',  'Version')}
            {sortableTh('foundIn', 'w-64',  'Found In')}
            <th className={`${thClass} w-24`}><span className="sr-only">Package details</span></th>
          </tr>
        </thead>
        <tbody>
          {sortedPackages.map(([key, pkg]) => {
            const toolChunks = chunkArray(
              comparison.tools.map(tool => ({
                tool, found: pkg.foundInTools.includes(tool.name),
              })),
              4
            );
            return (
              <React.Fragment key={key}>
                <tr className="border-b border-border hover:bg-surface-alt">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-foreground truncate" title={pkg.name}>{pkg.name}</div>
                      {(pkg.hasMetadataConflicts || pkg.foundInTools.length !== comparison.tools.length) && (
                        <AlertTriangle size={16} className="text-warning-fg shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <PackageTypeBadge type={pkg.packageType} />
                  </td>
                  <td className="py-3 px-4 text-foreground-muted font-mono text-body-sm truncate" title={pkg.version}>
                    {pkg.version}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {toolChunks.map((chunk, chunkIdx) => (
                        <div key={chunkIdx} className="flex gap-1 flex-wrap">
                          {chunk.map(({ tool, found }) => (
                            <span
                              key={tool.name}
                              className={`px-2 py-1 rounded-badge text-caption font-medium ${
                                found ? 'text-primary-foreground' : 'bg-input text-foreground-subtle'
                              }`}
                              style={found ? { backgroundColor: toolColor(tool.name) } : {}}
                            >
                              {tool.name}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setExpandedPackage(expandedPackage === key ? null : key)}
                      className="text-primary-fg hover:underline text-body-sm font-medium whitespace-nowrap"
                    >
                      {expandedPackage === key ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>
                {expandedPackage === key && (
                  <tr className="bg-surface-alt">
                    <td colSpan={5} className="py-4 px-4">
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <PackageMetadataDetails
                          packageData={pkg}
                          tools={comparison.tools}
                        />
                      </motion.div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {sortedPackages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-foreground-muted">No packages found matching the current filter.</p>
        </div>
      )}
    </div>
  );
};
