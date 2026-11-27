// The shape of one grype match in grype's JSON output, translated from the Go structs in
// anchore/grype, grype/presenter/models (v0.120.1, the version the worker pins).
// Field names are grype's JSON names. A Go field tagged omitempty is optional here. Go's
// embedded VulnerabilityMetadata is flattened into the vulnerability object, as in the JSON.

// match.go: Match
export type GrypeMatch = {
  vulnerability: GrypeVulnerability;
  relatedVulnerabilities?: GrypeVulnerabilityMetadata[];
  matchDetails?: GrypeMatchDetails[];
  artifact: GrypePackage;
};

// match.go: MatchDetails (how grype made the match)
export type GrypeMatchDetails = {
  type: string;
  matcher: string;
  searchedBy?: unknown;
  found?: unknown;
  fix?: { suggestedVersion: string };
};

// vulnerability.go: Vulnerability (VulnerabilityMetadata embedded)
export type GrypeVulnerability = GrypeVulnerabilityMetadata & {
  fix: GrypeFix;
  advisories: GrypeAdvisory[];
  risk: number;
};

// vulnerability.go: Fix
export type GrypeFix = {
  versions: string[];
  state: string;
  available?: GrypeFixAvailable[];
};

// vulnerability.go: FixAvailable
export type GrypeFixAvailable = {
  version: string;
  date: string;
  kind?: string;
};

// vulnerability.go: Advisory
export type GrypeAdvisory = {
  id: string;
  link: string;
};

// vulnerability_metadata.go: VulnerabilityMetadata
export type GrypeVulnerabilityMetadata = {
  id: string;
  dataSource: string;
  namespace?: string;
  severity?: string;
  urls: string[];
  description?: string;
  cvss: GrypeCvss[];
  knownExploited?: GrypeKnownExploited[];
  epss?: GrypeEpss[];
  cwes?: GrypeCwe[];
};

// vulnerability_metadata.go: KnownExploited (CISA's known-exploited catalogue)
export type GrypeKnownExploited = {
  cve: string;
  vendorProject?: string;
  product?: string;
  dateAdded?: string;
  requiredAction?: string;
  dueDate?: string;
  knownRansomwareCampaignUse: string;
  notes?: string;
  urls?: string[];
  cwes?: string[];
};

// vulnerability_metadata.go: EPSS (probability of exploitation in the next 30 days)
export type GrypeEpss = {
  cve: string;
  epss: number;
  percentile: number;
  date: string;
};

// vulnerability_metadata.go: CWE (weakness type)
export type GrypeCwe = {
  cve: string;
  cwe: string;
  source?: string;
  type?: string;
};

// cvss.go: Cvss
export type GrypeCvss = {
  source?: string;
  type?: string;
  version: string;
  vector: string;
  metrics: GrypeCvssMetrics;
  vendorMetadata?: unknown;
};

// cvss.go: CvssMetrics
export type GrypeCvssMetrics = {
  baseScore: number;
  exploitabilityScore?: number;
  impactScore?: number;
};

// package.go: Package (the artifact grype matched)
export type GrypePackage = {
  id: string;
  name: string;
  version: string;
  type: string;
  locations: GrypeLocation[];
  language: string;
  licenses: string[];
  cpes: string[];
  purl: string;
  upstreams: { name: string }[];
  metadataType?: string;
  metadata?: unknown;
  annotations?: Record<string, string[]>;
};

// syft file.Location, as grype writes it
export type GrypeLocation = {
  path: string;
  layerID?: string;
  accessPath?: string;
};
