import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Check } from 'lucide-react';
import { IPackageComparison } from '@/models/IComparisonResult';
import { IToolInfo } from '@/models/ISbom';
import { PurlAnalysisCard } from './PurlAnalysisCard';

interface PackageMetadataDetailsProps {
  packageData: IPackageComparison;
  tools: IToolInfo[];
  toolColors: string[];
}

export const PackageMetadataDetails: React.FC<PackageMetadataDetailsProps> = ({
  packageData,
  tools,
  toolColors,
}) => {
  const renderMetadataSection = (
    title: string,
    values: string[],
    hasConflict: boolean,
    metadataKey: 'supplier' | 'license' | 'hash' | 'purl' | 'cpe'
  ) => {
    if (values.length === 0) {
      return (
        <div>
          <h5 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">{title}</h5>
          <p className="text-sm text-gray-500 dark:text-gray-500 italic">Not reported by any tool</p>
        </div>
      );
    }

    if (!hasConflict) {
      // All tools agree or only one value exists
      return (
        <div>
          <h5 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
            {title}
            <Check size={16} className="text-green-600 dark:text-green-400" />
          </h5>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-sm dark:text-white font-mono break-all">{values[0]}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Consistent across all tools
            </p>
          </div>
        </div>
      );
    }

    // Conflict: different values from different tools
    return (
      <div>
        <h5 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
          {title}
          <AlertTriangle size={16} className="text-amber-500" />
          <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
            Conflicts detected
          </span>
        </h5>
        <div className="space-y-2">
          {tools.map((tool, idx) => {
            const metadata = packageData.metadataByTool.get(tool.name);
            const value = metadata?.[metadataKey];
            
            return (
              <div
                key={tool.name}
                className="bg-white dark:bg-gray-700 rounded-lg p-3 border-l-4"
                style={{ borderLeftColor: toolColors[idx] }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: toolColors[idx] }}>
                    {tool.name}
                  </span>
                  {!value && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                      Not reported
                    </span>
                  )}
                </div>
                {value && (
                  <p className="text-sm dark:text-white font-mono break-all">{value}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tool Detection Status */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Tool Detection Status
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {tools.map((tool, idx) => {
            const found = packageData.foundInTools.includes(tool.name);
            return (
              <div
                key={tool.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  found
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                {found ? (
                  <CheckCircle size={16} style={{ color: toolColors[idx] }} />
                ) : (
                  <XCircle size={16} className="text-gray-400" />
                )}
                <span className="text-sm dark:text-gray-300">{tool.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier */}
        {renderMetadataSection(
          'Supplier',
          packageData.uniqueSuppliers,
          packageData.uniqueSuppliers.length > 1,
          'supplier'
        )}

        {/* License */}
        {renderMetadataSection(
          'License',
          packageData.uniqueLicenses,
          packageData.uniqueLicenses.length > 1,
          'license'
        )}
      </div>

      {/* Hash */}
      <div>
        {renderMetadataSection(
          'Hash',
          packageData.uniqueHashes,
          packageData.uniqueHashes.length > 1,
          'hash'
        )}
      </div>

      {/* pURL Analysis */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Package URL (pURL) Analysis
        </h4>
        {packageData.uniquePurls.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <AlertTriangle size={16} />
              <span className="text-sm">No pURL reported by any tool</span>
            </div>
          </div>
        ) : packageData.uniquePurls.length === 1 ? (
          <PurlAnalysisCard purl={packageData.uniquePurls[0]} />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                Multiple pURLs detected - Review required
              </span>
            </div>
            {tools.map((tool, idx) => {
              const metadata = packageData.metadataByTool.get(tool.name);
              const purl = metadata?.purl;
              const cpe = metadata?.cpe;
              
              return (
                <div
                  key={tool.name}
                  className="border-l-4 pl-4"
                  style={{ borderLeftColor: toolColors[idx] }}
                >
                  <div className="text-sm font-medium mb-2" style={{ color: toolColors[idx] }}>
                    {tool.name}
                  </div>
                  <PurlAnalysisCard purl={purl} cpe={cpe} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CPE Information */}
      {packageData.uniqueCpes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Common Platform Enumeration (CPE)
          </h4>
          {packageData.uniqueCpes.length === 1 ? (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm font-mono dark:text-white break-all">
                {packageData.uniqueCpes[0]}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Consistent across all tools
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  Multiple CPEs detected
                </span>
              </div>
              {tools.map((tool, idx) => {
                const metadata = packageData.metadataByTool.get(tool.name);
                const cpe = metadata?.cpe;
                
                if (!cpe) return null;
                
                return (
                  <div
                    key={tool.name}
                    className="bg-white dark:bg-gray-700 rounded-lg p-3 border-l-4"
                    style={{ borderLeftColor: toolColors[idx] }}
                  >
                    <div className="text-sm font-medium mb-1" style={{ color: toolColors[idx] }}>
                      {tool.name}
                    </div>
                    <p className="text-sm font-mono dark:text-white break-all">{cpe}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conflict Summary */}
      {packageData.hasMetadataConflicts && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                Metadata Conflicts Detected
              </h5>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                This package has inconsistent metadata across different SBOM tools. Review the details above
                to understand the differences and determine the correct values for your use case.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};