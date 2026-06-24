import { PkgType } from './purl/types';

export interface RichPackage {
  raw: unknown;
  sourceRef: string;
  name: string;
  version: string;
  pkgType: PkgType;
  purl?: string;
  cpes: string[];
  license?: string;
  supplier?: string;
  originator?: string;
  downloadLocation?: string;
  homepage?: string;
  description?: string;
  sourceInfo?: string;
  copyrightText?: string;
  hash?: string;
  files: RichFile[];
}

export interface RichFile {
  fileName: string;
  sourceRef: string;
  fileTypes?: string[];
  sha256?: string;
  sha1?: string;
  layerId?: string;
}

export interface LicenseInfo {
  declared: number;
  deducted: number;
  unknown: number;
}

export interface PackageInfo {
  [key: string]: number;
}

export interface SbomInfo {
  tool: string;
  toolVersion: string;
  vendor: string;
  format: string;
  created: string;
  imageId: string;
  spdxVersion: string;
  documentNamespace?: string;
  totalPackages: number;
  licenseInfo: LicenseInfo;
  packageInfo: PackageInfo;
}
