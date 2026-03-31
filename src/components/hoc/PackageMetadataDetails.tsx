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
          <h5 className="text-body-sm font-semibold text-foreground-muted mb-2">{title}</h5>
          <p className="text-body-sm text-foreground-subtle italic">Not reported by any tool</p>
        </div>
      );
    }

    if (!hasConflict) {
      return (
        <div>
          <h5 className="text-body-sm font-semibold text-foreground-muted mb-2 flex items-center gap-2">
            {title}
            <Check size={16} className="text-success" />
          </h5>
          <div className="bg-success-subtle rounded-panel p-3">
            <p className="text-body-sm text-foreground font-mono break-all">{values[0]}</p>
            <p className="text-caption text-foreground-muted mt-1">Consistent across all tools</p>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h5 className="text-body-sm font-semibold text-foreground-muted mb-2 flex items-center gap-2">
          {title}
          <AlertTriangle size={16} className="text-warning" />
          <span className="text-caption font-normal text-warning-fg">Conflicts detected</span>
        </h5>
        <div className="space-y-2">
          {tools.map((tool, idx) => {
            const metadata = packageData.metadataByTool.get(tool.name);
            const value = metadata?.[metadataKey];
            return (
              <div
                key={tool.name}
                className="bg-surface rounded-panel p-3 border-l-4"
                style={{ borderLeftColor: toolColors[idx] }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-body-sm font-medium" style={{ color: toolColors[idx] }}>
                    {tool.name}
                  </span>
                  {!value && (
                    <span className="text-caption text-foreground-subtle italic">Not reported</span>
                  )}
                </div>
                {value && <p className="text-body-sm text-foreground font-mono break-all">{value}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const cpeToolsCount = tools.filter(tool => packageData.metadataByTool.get(tool.name)?.cpe).length;

  return (
    <div className="space-y-6">
      {/* Tool Detection Status */}
      <div>
        <h4 className="text-body-sm font-semibold text-foreground-muted mb-3">Tool Detection Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {tools.map((tool, idx) => {
            const found = packageData.foundInTools.includes(tool.name);
            return (
              <div
                key={tool.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-panel ${
                  found ? 'bg-success-subtle' : 'bg-surface-alt'
                }`}
              >
                {found ? (
                  <CheckCircle size={16} style={{ color: toolColors[idx] }} />
                ) : (
                  <XCircle size={16} className="text-foreground-subtle" />
                )}
                <span className="text-body-sm text-foreground">{tool.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderMetadataSection('Supplier', packageData.uniqueSuppliers, packageData.uniqueSuppliers.length > 1, 'supplier')}
        {renderMetadataSection('License',  packageData.uniqueLicenses,  packageData.uniqueLicenses.length > 1,  'license')}
      </div>

      <div>{renderMetadataSection('Hash', packageData.uniqueHashes, packageData.uniqueHashes.length > 1, 'hash')}</div>

      {/* pURL Analysis */}
      <div>
        <h4 className="text-body-sm font-semibold text-foreground-muted mb-3">Package URL (pURL) Analysis</h4>
        {packageData.uniquePurls.length === 0 ? (
          <div className="bg-surface-alt rounded-panel p-4">
            <div className="flex items-center gap-2 text-foreground-muted">
              <AlertTriangle size={16} />
              <span className="text-body-sm">No pURL reported by any tool</span>
            </div>
          </div>
        ) : packageData.uniquePurls.length === 1 ? (
          <PurlAnalysisCard purl={packageData.uniquePurls[0]} />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-warning" />
              <span className="text-body-sm text-warning-fg font-medium">Multiple pURLs detected – Review required</span>
            </div>
            {tools.map((tool, idx) => {
              const metadata = packageData.metadataByTool.get(tool.name);
              return (
                <div key={tool.name} className="border-l-4 pl-4" style={{ borderLeftColor: toolColors[idx] }}>
                  <div className="text-body-sm font-medium mb-2" style={{ color: toolColors[idx] }}>{tool.name}</div>
                  <PurlAnalysisCard purl={metadata?.purl} cpe={metadata?.cpe} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CPE */}
      {packageData.uniqueCpes.length > 0 && (
        <div>
          <h4 className="text-body-sm font-semibold text-foreground-muted mb-3">Common Platform Enumeration (CPE)</h4>
          {packageData.uniqueCpes.length === 1 ? (
            <div className="bg-surface-alt rounded-panel p-4">
              <p className="text-body-sm font-mono text-foreground break-all">{packageData.uniqueCpes[0]}</p>
              <p className="text-caption text-foreground-muted mt-1">
                {cpeToolsCount === 1 ? 'Conflict detected (single CPE)' : 'Consistent across all tools'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-warning" />
                <span className="text-body-sm text-warning-fg font-medium">Multiple CPEs detected</span>
              </div>
              {tools.map((tool, idx) => {
                const cpe = packageData.metadataByTool.get(tool.name)?.cpe;
                if (!cpe) return null;
                return (
                  <div
                    key={tool.name}
                    className="bg-surface rounded-panel p-3 border-l-4"
                    style={{ borderLeftColor: toolColors[idx] }}
                  >
                    <div className="text-body-sm font-medium mb-1" style={{ color: toolColors[idx] }}>{tool.name}</div>
                    <p className="text-body-sm font-mono text-foreground break-all">{cpe}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conflict Summary */}
      {packageData.hasMetadataConflicts && (
        <div className="bg-warning-subtle border border-warning rounded-panel p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-body-sm font-semibold text-warning-fg mb-1">Metadata Conflicts Detected</h5>
              <p className="text-body-sm text-warning-fg">
                This package has inconsistent metadata across different SBOM tools. Review the details
                above to understand the differences and determine the correct values for your use case.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
