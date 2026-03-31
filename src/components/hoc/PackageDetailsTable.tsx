import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Database, Code, Box, Package, FileText, AlertTriangle } from 'lucide-react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { PackageMetadataDetails } from './PackageMetadataDetails';
import { TOOL_COLORS, getPackageTypeColor } from '@/lib/utils';

interface PackageDetailsTableProps {
  comparison: IMultiToolComparison;
  filter: string;
  searchTerm?: string;
}

const getPackageTypeIcon = (type?: string) => {
  switch (type) {
    case 'os':      return <Database size={16} />;
    case 'npm':
    case 'python':
    case 'maven':   return <Code size={16} />;
    case 'binary':  return <Box size={16} />;
    case 'library': return <Package size={16} />;
    default:        return <FileText size={16} />;
  }
};

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

  const thClass = 'text-left py-3 px-4 font-semibold text-foreground cursor-pointer';
  const sortIndicator = (key: string) => sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-border">
            <th className={`${thClass} w-1/4`}  onClick={() => handleSort('name')}>Package{sortIndicator('name')}</th>
            <th className={`${thClass} w-32`}   onClick={() => handleSort('type')}>Type{sortIndicator('type')}</th>
            <th className={`${thClass} w-32`}   onClick={() => handleSort('version')}>Version{sortIndicator('version')}</th>
            <th className={`${thClass} w-64`}   onClick={() => handleSort('foundIn')}>Found In{sortIndicator('foundIn')}</th>
            <th className={`${thClass} w-24`} />
          </tr>
        </thead>
        <tbody>
          {sortedPackages.map(([key, pkg]) => {
            const toolChunks = chunkArray(
              comparison.tools.map((tool, idx) => ({
                tool, found: pkg.foundInTools.includes(tool.name), colorIndex: idx,
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
                        <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-badge text-caption font-medium ${getPackageTypeColor(pkg.packageType)}`}>
                      {getPackageTypeIcon(pkg.packageType)}
                      {pkg.packageType || 'unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground-muted font-mono text-body-sm truncate" title={pkg.version}>
                    {pkg.version}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {toolChunks.map((chunk, chunkIdx) => (
                        <div key={chunkIdx} className="flex gap-1 flex-wrap">
                          {chunk.map(({ tool, found, colorIndex }) => (
                            <span
                              key={tool.name}
                              className={`px-2 py-1 rounded text-caption font-medium ${
                                found ? 'text-white' : 'bg-input text-foreground-subtle'
                              }`}
                              style={found ? { backgroundColor: TOOL_COLORS[colorIndex] } : {}}
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
                      className="text-primary hover:text-primary-hover text-body-sm font-medium whitespace-nowrap"
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
                          toolColors={TOOL_COLORS}
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
