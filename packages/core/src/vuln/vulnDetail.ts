// ---------------------------------------------------------------------------
// One shape for what every scanner says about a vulnerability. Nothing outside
// the wrappers in tools/ reads a tool's own field names or scales.
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'negligible' | 'unknown';
export type FixStatus = 'fixed' | 'not_fixed' | 'wont_fix' | 'deferred' | 'unknown';

// one CVSS score, from one source
export interface CvssScore {
  // who scored it: "nvd", "redhat", ... (absent when the tool does not say)
  source?: string;
  // "2", "3", "3.1"
  version?: string;
  score?: number;
  vector?: string;
  // who the scanner names as the source of the score: "Primary" or "Secondary" (grype)
  type?: string;
  exploitabilityScore?: number;
  impactScore?: number;
}

// the probability the CVE is exploited in the next 30 days, and its percentile among all CVEs
export interface Epss {
  score: number;
  percentile: number;
}

export interface VulnDetail {
  // the id the tool reports the vulnerability under: CVE-, GHSA-, DSA-, GO-, ...
  id: string;
  // every other id for the same vulnerability, e.g. the CVE behind a GHSA or GO id
  aliases: string[];
  severity: Severity;
  // the primary CVSS base score: version 3 first, else whichever is given
  score?: number;
  status: FixStatus;
  // the version that fixes it, when it is fixed
  fixedVersion?: string;
  // who published it: a data source (trivy), a namespace (grype)
  source?: string;
  cvss: CvssScore[];
  // the primary advisory link
  url?: string;
  // what the vulnerability is, as the scanner describes it
  description?: string;
  // the scanner's own risk score for the vulnerability (grype)
  risk?: number;
  // exploitation probability, when the scanner gives it
  epss?: Epss;
  // weakness types (CWE ids), when the scanner gives them
  cwes?: string[];
  // the short name of the vulnerability, when the scanner gives one (trivy)
  title?: string;
  // RFC 3339 dates, as the advisory source gives them (trivy)
  publishedDate?: string;
  lastModifiedDate?: string;
  // each source's own severity (trivy), and which source the shown severity comes from
  vendorSeverity?: Partial<Record<string, Severity>>;
  severitySource?: string;
  // the name of the source, e.g. "Debian Security Tracker" 
  sourceName?: string;
}

// what the scanner says about one vulnerability on one package: scanners can give a different fix per package, and the
// match on each package can have its own severity, score and source (one CVE can match a PyPI and a Debian package)
export interface PackageFix {
  status: FixStatus;
  // every fixed version the scanner lists for the package: one for most, several when the scanner lists a fix per branch
  fixedVersions: string[];
  severity: Severity;
  score?: number;
  source?: string;
  // the match's own CVSS scores and advisory link
  cvss?: CvssScore[];
  url?: string;
}

// the CVE-level fix, from its package fixes: the status all packages agree on, otherwise unknown;
// the version only when every package lists the same single version
export function settleFix(fixes: PackageFix[]): { status: FixStatus; fixedVersion?: string } {
  if (fixes.length === 0) return { status: 'unknown' };
  if (new Set(fixes.map(f => f.status)).size > 1) return { status: 'unknown' };
  const status = fixes[0].status;
  const lists = new Set(fixes.map(f => f.fixedVersions.join('\n')));
  const single = fixes[0].fixedVersions.length === 1 ? fixes[0].fixedVersions[0] : undefined;
  return { status, fixedVersion: lists.size === 1 ? single : undefined };
}

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'negligible'];

export function normalizeSeverity(value: unknown): Severity {
  const v = typeof value === 'string' ? value.toLowerCase() : '';
  return SEVERITIES.find(s => s === v) ?? 'unknown';
}

// the first version 3 score, else the first score of any version
export function primaryScore(cvss: CvssScore[]): number | undefined {
  return (
    cvss.find(c => c.version?.startsWith('3') && c.score !== undefined)?.score ??
    cvss.find(c => c.score !== undefined)?.score
  );
}

// the first value that is a non-empty string
export function firstText(...values: unknown[]): string | undefined {
  return values.find((v): v is string => typeof v === 'string' && v !== '');
}

// the other ids, as text, without repeats and without the primary id
export function otherIds(primary: string, ids: unknown[]): string[] {
  const texts = ids.filter((x): x is string => typeof x === 'string' && x !== '' && x !== primary);
  return [...new Set(texts)];
}
