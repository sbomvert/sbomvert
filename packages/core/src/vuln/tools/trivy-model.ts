// The shape of trivy's JSON output (`trivy sbom ... --format json`), translated from the Go
// structs at aquasecurity/trivy v0.76.0 (the version the worker pins): pkg/types (Report,
// Result, DetectedVulnerability), aquasecurity/trivy-db pkg/types (Vulnerability, CVSS,
// DataSource) at the version that tag uses, and pkg/fanal/types (PkgIdentifier, Layer).
// Field names are trivy's JSON names. A Go field tagged omitempty is optional here. Go's
// embedded trivy-db Vulnerability is flattened into the vulnerability object, as in the JSON.

// pkg/types/report.go: Report (only what the wrapper reads)
export type TrivyReport = {
  Results?: TrivyResult[];
};

// pkg/types/report.go: Result
export type TrivyResult = {
  Target: string;
  Class?: string;
  Type?: string;
  Vulnerabilities?: TrivyVulnerability[];
};

// pkg/types/vulnerability.go: DetectedVulnerability, with trivy-db's Vulnerability embedded
export type TrivyVulnerability = TrivyVulnerabilityDetail & {
  VulnerabilityID: string;
  VendorIDs?: string[];
  PkgID?: string;
  PkgName?: string;
  PkgPath?: string;
  PkgIdentifier: TrivyPkgIdentifier;
  InstalledVersion?: string;
  FixedVersion?: string;
  Status?: string;
  Layer?: TrivyLayer;
  // the source whose severity is shown in Severity
  SeveritySource?: string;
  PrimaryURL?: string;
  DataSource?: TrivyDataSource;
  Fingerprint?: string;
  Custom?: unknown;
};

// trivy-db pkg/types: Vulnerability (the advisory's details, as trivy writes them)
export type TrivyVulnerabilityDetail = {
  Title?: string;
  Description?: string;
  // "UNKNOWN", "LOW", "MEDIUM", "HIGH" or "CRITICAL", from the source named in SeveritySource
  Severity: string;
  CweIDs?: string[];
  // each source's severity, as trivy's integer Severity: 0 unknown, 1 low, 2 medium, 3 high, 4 critical
  VendorSeverity?: Record<string, number>;
  // each source's scores, keyed by source ("nvd", "redhat", ...)
  CVSS?: Record<string, TrivyCvss>;
  References?: string[];
  // RFC 3339 timestamps
  PublishedDate?: string;
  LastModifiedDate?: string;
};

// trivy-db pkg/types: CVSS
export type TrivyCvss = {
  V2Vector?: string;
  V3Vector?: string;
  V40Vector?: string;
  V2Score?: number;
  V3Score?: number;
  V40Score?: number;
};

// trivy-db pkg/types: DataSource
export type TrivyDataSource = {
  ID: string;
  Name?: string;
  URL?: string;
};

// fanal pkg/types: PkgIdentifier
export type TrivyPkgIdentifier = {
  PURL?: string;
  UID?: string;
  BOMRef?: string;
};

// fanal pkg/types: Layer
export type TrivyLayer = {
  Digest?: string;
  DiffID?: string;
};
