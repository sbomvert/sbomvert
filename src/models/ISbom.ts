export interface ISbomPackage {
  name: string;
  version: string;
  supplier?: string;
  license?: string;
  packageType:
    | 'os'
    | 'npm'
    | 'python'
    | 'maven'
    | 'binary'
    | 'library'
    | '.net'
    | 'generic'
    | 'rust'
    | 'golang';
  hash?: string;
  purl?: string;
  cpe?: string;
  // what the compare view matches the package on across tools (@sbomvert/core/translate/comparisonKeys); without one,
  // its name and version
  key?: string;
}

export interface IToolInfo {
  name: string;
  version?: string;
  vendor?: string;
  format?: 'SPDX' | 'CycloneDX';
}

export interface ISbom {
  format: 'SPDX' | 'CycloneDX';
  tool: string;
  toolInfo: IToolInfo;
  imageId: string;
  packages: ISbomPackage[];
  timestamp: string;
}
