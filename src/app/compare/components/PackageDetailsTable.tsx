import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Database, Code, Box, Package, FileText, AlertTriangle } from 'lucide-react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { PackageMetadataDetails } from './PackageMetadataDetails';
import { TOOL_COLORS, getPackageTypeColor } from '@/lib/utils';

interface PackageDetailsTableProps {
  comparison: IMultiToolComparison;
  filter: string;
}

const getPackageTypeIcon = (type?: string) => {
  switch (type) {
    case 'os':
      return <Database size={16} />;
    case 'npm':
    case 'python':
    case 'maven':
      return <Code size={16} />;
    case 'binary':
      return <Box size={16} />;
    case 'library':
      return <Package size={16} />;
    default:
      return <FileText size={16} />;
  }
};

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const PackageDetailsTable: React.FC<PackageDetailsTableProps> = ({ comparison, filter }) => {
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredPackages = useMemo(() => {
    const packages = Array.from(comparison.allPackages.entries());

    switch (filter) {
      case 'common':
        return packages.filter(
          ([, pkg]) => pkg.foundInTools.length === comparison.tools.length
        );
      case 'unique':
        return packages.filter(([, pkg]) => pkg.foundInTools.length === 1);
      default:
        return packages;
    }
  }, [comparison, filter]);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedPackages = useMemo(() => {
    return [...filteredPackages].sort((a, b) => {
      const pkgA = a[1];
      const pkgB = b[1];

      let valueA: any;
      let valueB: any;
      if (sortKey === 'name') {
        valueA = (pkgA.name || '').toLowerCase();
        valueB = (pkgB.name || '').toLowerCase();
      } else if (sortKey === 'type') {
        valueA = (pkgA.packageType || '').toLowerCase();
        valueB = (pkgB.packageType || '').toLowerCase();
      } else if (sortKey === 'version') {
        valueA = (pkgA.version || '').toLowerCase();
        valueB = (pkgB.version || '').toLowerCase();
      } else if (sortKey === 'foundIn') {
        valueA = pkgA.foundInTools.length;
        valueB = pkgB.foundInTools.length;
      } else {
        valueA = '';
        valueB = '';
      }

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPackages, sortKey, sortDirection]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b dark:border-gray-700">
            <th
              className="text-left py-3 px-4 font-semibold dark:text-white w-1/4 cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Package {sortKey === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className="text-left py-3 px-4 font-semibold dark:text-white w-32 cursor-pointer"
              onClick={() => handleSort('type')}
            >
              Type {sortKey === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className="text-left py-3 px-4 font-semibold dark:text-white w-32 cursor-pointer"
              onClick={() => handleSort('version')}
            >
              Version {sortKey === 'version' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className="text-left py-3 px-4 font-semibold dark:text-white w-64 cursor-pointer"
              onClick={() => handleSort('foundIn')}
            >
              Found In {sortKey === 'foundIn' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="text-left py-3 px-4 font-semibold dark:text-white w-24"></th>
          </tr>
        </thead>
        <tbody>
          {sortedPackages.map(([key, pkg]) => {
            const toolChunks = chunkArray(
              comparison.tools.map((tool, idx) => ({
                tool,
                found: pkg.foundInTools.includes(tool.name),
                colorIndex: idx,
              })),
              4
            );

            return (
              <React.Fragment key={key}>
                <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="font-medium dark:text-white truncate" title={pkg.name}>
                        {pkg.name}
                      </div>
                      {(pkg.hasMetadataConflicts || pkg.foundInTools.length != comparison.tools.length) && (
                        <AlertTriangle 
                          size={16} 
                          className="text-amber-500 flex-shrink-0" 
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getPackageTypeColor(
                        pkg.packageType
                      )}`}
                    >
                      {getPackageTypeIcon(pkg.packageType)}
                      {pkg.packageType || 'unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 dark:text-gray-300 font-mono text-sm truncate" title={pkg.version}>
                    {pkg.version}
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      {toolChunks.map((chunk, chunkIdx) => (
                        <div key={chunkIdx} className="flex gap-1 flex-wrap">
                          {chunk.map(({ tool, found, colorIndex }) => (
                            <span
                              key={tool.name}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                found
                                  ? 'text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
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
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium whitespace-nowrap"
                    >
                      {expandedPackage === key ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>
                {expandedPackage === key && (
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
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
          <p className="text-gray-500 dark:text-gray-400">
            No packages found matching the current filter.
          </p>
        </div>
      )}
    </div>
  );
};
