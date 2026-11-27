import {
  CvssScore,
  FixStatus,
  PackageFix,
  VulnDetail,
  firstText,
  normalizeSeverity,
  otherIds,
  primaryScore,
} from '../vulnDetail';
import type { GrypeMatch } from './grype-model';

export type { GrypeMatch };

// grype's own fix states
const GRYPE_FIX_STATUS: Record<string, FixStatus> = {
  fixed: 'fixed',
  'not-fixed': 'not_fixed',
  'wont-fix': 'wont_fix',
};

// the fix grype gives for this match's package: its status, and every fixed version it lists
export function grypePackageFix(match: GrypeMatch): PackageFix {
  const state = match.vulnerability.fix?.state ?? '';
  const versions = (match.vulnerability.fix?.versions ?? []).filter(v => v !== '');
  const { severity, score, source, cvss, url } = grypeVulnDetail(match);
  return {
    status: GRYPE_FIX_STATUS[state] ?? 'unknown',
    fixedVersions: state === 'fixed' ? versions : [],
    severity,
    score,
    source,
    cvss,
    url,
  };
}

// one match of grype's `matches`
// the id a match is reported under: its CVE when it has one, so a GHSA or GO advisory for a CVE is the same
// vulnerability as the CVE (the advisory id stays an alias). The first CVE is used when there are several.
export function grypeCveId(match: GrypeMatch): string {
  const v = match.vulnerability;
  if (v.id.startsWith('CVE-')) return v.id;
  const cve = (match.relatedVulnerabilities ?? []).map(r => r.id).find(id => id.startsWith('CVE-'));
  return cve ?? v.id;
}

export function grypeVulnDetail(match: GrypeMatch): VulnDetail {
  const v = match.vulnerability;
  const id = grypeCveId(match);
  const cvss: CvssScore[] = (v.cvss ?? []).map(c => ({
    source: c.source,
    type: c.type,
    version: c.version,
    score: c.metrics?.baseScore,
    exploitabilityScore: c.metrics?.exploitabilityScore,
    impactScore: c.metrics?.impactScore,
    vector: c.vector,
  }));
  const state = v.fix?.state ?? '';
  const epss = v.epss?.[0];
  const cwes = [...new Set((v.cwes ?? []).map(c => c.cwe).filter(Boolean))];
  return {
    id,
    aliases: otherIds(id, [v.id, ...(match.relatedVulnerabilities ?? []).map(r => r.id)]),
    severity: normalizeSeverity(v.severity),
    score: primaryScore(cvss),
    status: GRYPE_FIX_STATUS[state] ?? 'unknown',
    fixedVersion: state === 'fixed' ? firstText(v.fix?.versions?.[0]) : undefined,
    source: v.namespace,
    cvss,
    url: firstText(v.dataSource, v.urls?.[0]),
    description: firstText(v.description),
    risk: v.risk,
    epss: epss ? { score: epss.epss, percentile: epss.percentile } : undefined,
    cwes: cwes.length > 0 ? cwes : undefined,
  };
}
