import { PkgType } from '@sbomvert/core/purl/types';

export type SbomFormatName = 'SPDX' | 'CycloneDX';

export interface ISbomPackage {
  name: string;
  version: string;
  supplier?: string;
  license?: string;
  packageType: PkgType;
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
  format?: SbomFormatName;
}

export interface ISbom {
  format: SbomFormatName;
  tool: string;
  toolInfo: IToolInfo;
  imageId: string;
  packages: ISbomPackage[];
  timestamp: string;
}
