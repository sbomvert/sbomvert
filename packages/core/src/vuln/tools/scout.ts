import {
  CvssScore,
  FixStatus,
  PackageFix,
  VulnDetail,
  firstText,
  normalizeSeverity,
} from '../vulnDetail';

// one SARIF rule of `docker scout cves --format sarif`: one rule per CVE, listing the purls it affects
export interface ScoutRule {
  id: string;
  helpUri?: string;
  help?: { text?: string };
  properties: {
    purls?: string[];
    cvssV3_severity?: string;
    // Scout's score for the CVE, as text ("7.5"); given for every rule
    'security-severity'?: string;
    cvssV3?: number;
    cvssV3_vector?: string;
    // a version, or the text "not fixed"
    fixed_version?: string;
  };
}

// the score: Scout's security-severity, which is also cvssV3 where that is given
function scoutScore(rule: ScoutRule): number | undefined {
  const text = rule.properties['security-severity'];
  const score = text ? Number(text) : NaN;
  return Number.isFinite(score) ? score : undefined;
}

// the fix: a version is a fixed vulnerability; "not fixed" is not; anything else is unknown
function scoutFix(fixed: string | undefined): { status: FixStatus; fixedVersion?: string } {
  if (fixed && /^\d/.test(fixed)) return { status: 'fixed', fixedVersion: fixed };
  if (fixed === 'not fixed') return { status: 'not_fixed' };
  return { status: 'unknown' };
}

// the fix Scout gives for the packages of this rule: one fixed version per CVE, shared by its packages
export function scoutPackageFix(rule: ScoutRule): PackageFix {
  const { status, fixedVersion } = scoutFix(rule.properties.fixed_version);
  return { status, fixedVersions: fixedVersion ? [fixedVersion] : [] };
}

// one rule of Scout's SARIF
export function scoutVulnDetail(rule: ScoutRule): VulnDetail {
  const { status, fixedVersion } = scoutFix(rule.properties.fixed_version);
  const vector = firstText(rule.properties.cvssV3_vector);
  const cvss: CvssScore[] = vector
    ? [{ version: vector.match(/^CVSS:(\d+(?:\.\d+)?)/)?.[1], score: rule.properties.cvssV3, vector }]
    : [];
  return {
    id: rule.id,
    aliases: [],
    severity: normalizeSeverity(rule.properties.cvssV3_severity),
    score: scoutScore(rule),
    status,
    fixedVersion,
    cvss,
    url: firstText(rule.helpUri),
    description: firstText(rule.help?.text?.trim()),
  };
}
