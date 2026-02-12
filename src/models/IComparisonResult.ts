import { ISbomPackage, IToolInfo } from './ISbom';

// Represents package metadata that may differ across tools
export interface IPackageMetadata {
  supplier?: string;
  license?: string;
  hash?: string;
  purl?: string;
  cpe?: string;
}

// A package with all its variations across tools
export interface IPackageComparison {
  // Common attributes (same across all tools)
  name: string;
  version: string;
  packageType: ISbomPackage['packageType'];

  // Tools that detected this package
  foundInTools: string[];

  // Metadata per tool (may differ)
  metadataByTool: Map<string, IPackageMetadata>;

  // Consolidated metadata (for display)
  hasMetadataConflicts: boolean;
  uniqueSuppliers: string[];
  uniqueLicenses: string[];
  uniquePurls: string[];
  uniqueCpes: string[];
  uniqueHashes: string[];
}

export interface IMultiToolComparison {
  imageId: string;
  tools: IToolInfo[];
  allPackages: Map<string, IPackageComparison>;
  statistics: {
    toolCounts: Record<string, number>;
    commonToAll: number;
    uniquePerTool: Record<string, number>;
    packagesWithConflicts: number;
  };
  // Per-tool information
  infoByTool: Record<
    string,
    {
      packages: string[]; // ["package@version", ...]
      purls: string[]; // ["pkg:type/name@version", ...]
    }
  >;
}
