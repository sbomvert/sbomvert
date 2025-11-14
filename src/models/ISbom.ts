export interface ISbomPackage {
  name: string;
  version: string;
  supplier?: string;
  license?: string;
  packageType: 'os' | 'npm' | 'python' | 'maven' | 'binary' | 'library' | '.net' | 'generic';
  hash?: string;
  purl?: string;
  cpe?: string;
}

export interface IToolInfo {
  name: string;
  version: string;
  vendor: string;
  format: 'SPDX' | 'CycloneDX';
}

export interface ISbom {
  format: 'SPDX' | 'CycloneDX';
  tool: string;
  toolInfo: IToolInfo;
  imageId: string;
  packages: ISbomPackage[];
  timestamp: string;
}
