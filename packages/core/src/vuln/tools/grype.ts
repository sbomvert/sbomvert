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
  return {
    status: GRYPE_FIX_STATUS[state] ?? 'unknown',
    fixedVersions: state === 'fixed' ? versions : [],
  };
}

// one match of grype's `matches`
export function grypeVulnDetail(match: GrypeMatch): VulnDetail {
  const v = match.vulnerability;
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
    id: v.id,
    aliases: otherIds(v.id, (match.relatedVulnerabilities ?? []).map(r => r.id)),
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
