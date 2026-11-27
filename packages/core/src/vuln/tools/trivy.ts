import {
  CvssScore,
  FixStatus,
  PackageFix,
  Severity,
  VulnDetail,
  firstText,
  normalizeSeverity,
  otherIds,
  primaryScore,
} from '../vulnDetail';
import type { TrivyCvss, TrivyVulnerability } from './trivy-model';

export type { TrivyVulnerability };

// trivy's own statuses, as they are written in its JSON
const TRIVY_STATUS: Record<string, FixStatus> = {
  fixed: 'fixed',
  affected: 'not_fixed',
  will_not_fix: 'wont_fix',
  fix_deferred: 'deferred',
};

// trivy writes each source's severity as an integer: 0 unknown, 1 low, 2 medium, 3 high, 4 critical
const TRIVY_SEVERITY_BY_INT: Severity[] = ['unknown', 'low', 'medium', 'high', 'critical'];

// one CVSS entry per source and version: v2, v3 and v4
function trivyCvss(cvss: Record<string, TrivyCvss> | undefined): CvssScore[] {
  const out: CvssScore[] = [];
  for (const [source, s] of Object.entries(cvss ?? {})) {
    if (s.V3Score !== undefined || s.V3Vector !== undefined)
      out.push({ source, version: '3', score: s.V3Score, vector: s.V3Vector });
    if (s.V2Score !== undefined || s.V2Vector !== undefined)
      out.push({ source, version: '2', score: s.V2Score, vector: s.V2Vector });
    if (s.V40Score !== undefined || s.V40Vector !== undefined)
      out.push({ source, version: '4.0', score: s.V40Score, vector: s.V40Vector });
  }
  return out;
}

// each source's own severity, by source name
function vendorSeverities(vs: Record<string, number> | undefined): Partial<Record<string, Severity>> | undefined {
  const entries = Object.entries(vs ?? {}).map(
    ([source, level]) => [source, TRIVY_SEVERITY_BY_INT[level] ?? 'unknown'] as const
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

// the fix trivy gives for this entry's package: its status, and the fixed version it names
export function trivyPackageFix(v: TrivyVulnerability): PackageFix {
  const fixed = firstText(v.FixedVersion);
  const { severity, score, source, cvss, url } = trivyVulnDetail(v);
  return {
    status: TRIVY_STATUS[v.Status ?? ''] ?? 'unknown',
    fixedVersions: fixed ? [fixed] : [],
    severity,
    score,
    source,
    cvss,
    url,
  };
}

// one entry of trivy's `Vulnerabilities`
export function trivyVulnDetail(v: TrivyVulnerability): VulnDetail {
  const id = v.VulnerabilityID;
  const cvss = trivyCvss(v.CVSS);
  const cwes = [...new Set((v.CweIDs ?? []).filter(Boolean))];
  return {
    id,
    aliases: otherIds(id, v.VendorIDs ?? []),
    severity: normalizeSeverity(v.Severity),
    score: primaryScore(cvss),
    status: TRIVY_STATUS[v.Status ?? ''] ?? 'unknown',
    fixedVersion: firstText(v.FixedVersion),
    source: v.DataSource?.ID,
    cvss,
    url: firstText(v.PrimaryURL, v.DataSource?.URL, ...(v.References ?? [])),
    description: firstText(v.Description),
    title: firstText(v.Title),
    cwes: cwes.length > 0 ? cwes : undefined,
    publishedDate: firstText(v.PublishedDate),
    lastModifiedDate: firstText(v.LastModifiedDate),
    vendorSeverity: vendorSeverities(v.VendorSeverity),
    severitySource: firstText(v.SeveritySource),
    sourceName: firstText(v.DataSource?.Name),
  };
}
