export interface SpdxChecksum { algorithm: string; checksumValue: string; }
export interface SpdxExternalRef { referenceCategory: string; referenceType: string; referenceLocator: string; }
export interface SpdxRelationship {
  spdxElementId: string;
  relatedSpdxElement: string;
  relationshipType: string;
}

export interface SpdxDocument {
  spdxVersion: string;
  name: string;
  documentNamespace?: string;
  dataLicense?: string;
  creationInfo: { creators: string[]; created: string; licenseListVersion?: string; };
  packages: SpdxPackage[];
  files?: SpdxFile[];
  relationships?: SpdxRelationship[];
}
export interface SpdxFile {
  fileName: string;
  SPDXID: string;
  fileTypes?: string[];
  checksums?: SpdxChecksum[];
  licenseConcluded?: string;
  licenseInfoInFiles?: string[];
  copyrightText?: string;
  comment?: string; // contains layerID
}

export interface SpdxPackage {
  name: string;
  SPDXID: string;
  versionInfo?: string;
  supplier?: string;
  originator?: string;
  downloadLocation?: string;
  homepage?: string;
  sourceInfo?: string;
  description?: string;
  comment?: string;
  copyrightText?: string;
  licenseConcluded?: string;
  licenseDeclared?: string;
  filesAnalyzed?: boolean;
  primaryPackagePurpose?: string;
  packageVerificationCode?: { packageVerificationCodeValue: string };
  checksums?: SpdxChecksum[];
  externalRefs?: SpdxExternalRef[];
  attributionTexts?: string[];
  annotations?: Array<{ annotator: string; comment: string }>;
}