import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Database, Code, Box, Package, FileText } from 'lucide-react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { PurlAnalysisCard } from './PurlAnalysisCard';
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

// Helper function to chunk array into groups
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const PackageDetailsTable: React.FC<PackageDetailsTableProps> = ({ comparison, filter }) => {
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);

  const filteredPackages = useMemo(() => {
    const packages = Array.from(comparison.allPackages.entries());

    switch (filter) {
      case 'common':
        return packages.filter(
          ([, { foundInTools }]) => foundInTools.length === comparison.tools.length
        );
      case 'unique':
        return packages.filter(([, { foundInTools }]) => foundInTools.length === 1);
      default:
        return packages;
    }
  }, [comparison, filter]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b dark:border-gray-700">
            <th className="text-left py-3 px-4 font-semibold dark:text-white w-1/4">Package</th>
            <th className="text-left py-3 px-4 font-semibold dark:text-white w-32">Type</th>
            <th className="text-left py-3 px-4 font-semibold dark:text-white w-32">Version</th>
            <th className="text-left py-3 px-4 font-semibold dark:text-white w-40">License</th>
            <th className="text-left py-3 px-4 font-semibold dark:text-white w-64">Found In</th>
            <th className="text-left py-3 px-4 font-semibold dark:text-white w-24"></th>
          </tr>
        </thead>
        <tbody>
          {filteredPackages.map(([key, { package: pkg,foundInTools }]) => {
            // Chunk tools into groups of 4
            const toolChunks = chunkArray(
              comparison.tools.map((tool, idx) => ({
                tool,
                found: foundInTools.includes(tool.name),
                colorIndex: idx,
              })),
              4
            );

            return (
              <React.Fragment key={key}>
                <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4">
                    <div className="font-medium dark:text-white truncate" title={pkg.name}>
                      {pkg.name}
                    </div>
                    {pkg.supplier && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={pkg.supplier}>
                        {pkg.supplier}
                      </div>
                    )}
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
                    <span
                      className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded text-xs truncate max-w-full"
                      title={pkg.license || 'Unknown'}
                    >
                      {pkg.license || 'Unknown'}
                    </span>
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
                    <td colSpan={6} className="py-4 px-4">
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Package Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              {pkg.hash && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Hash:</span>
                                  <div className="font-mono text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 break-all">
                                    {pkg.hash}
                                  </div>
                                </div>
                              )}
                              {pkg.supplier && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Supplier:</span>
                                  <span className="ml-2 dark:text-white">{pkg.supplier}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Tool Detection
                            </h4>
                            <div className="space-y-1">
                              {comparison.tools.map((tool, idx) => {
                                const found = foundInTools.includes(tool.name);
                                return (
                                  <div key={tool.name} className="flex items-center gap-2 text-sm">
                                    {found ? (
                                      <CheckCircle size={16} style={{ color: TOOL_COLORS[idx] }} />
                                    ) : (
                                      <XCircle size={16} className="text-gray-400" />
                                    )}
                                    <span className="dark:text-gray-300">{tool.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <PurlAnalysisCard purl={pkg.purl} cpe={pkg.cpe} />
                      </motion.div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {filteredPackages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No packages found matching the current filter.
          </p>
        </div>
      )}
    </div>
  );
};