import { CVEReport } from '@/lib/vuln/vulnLoader';
import type { FixStatus, PackageFix, VulnDetail } from '@sbomvert/core/vuln/vulnDetail';
import { VulnReport } from '@sbomvert/core/vuln/vulnutils';
import { InferPkgTypeFromPurl } from '@sbomvert/core/purl/converter';
import type { PkgType } from '@sbomvert/core/purl/types';

export interface PackageRow {
  pkg: string;
  // the SBOM package type of the package, as the SBOM comparison shows it
  packageType: PkgType;
  byCve: Record<string, string[]>;
  detectedBy: Set<string>;
}


export function buildPackageRows(cves: CVEReport, tools: string[]): PackageRow[] {
  const pkgSet = new Set<string>();
  for (const tool of tools) {
    for (const pkg of Object.keys(cves[tool]?.vulns_by_package ?? {})) pkgSet.add(pkg);
  }
  return Array.from(pkgSet)
    .map((pkg) => {
      const byCve: Record<string, string[]> = {};
      const detectedBy = new Set<string>();
      for (const tool of tools) {
        // a CVE is listed once per package, even when the report repeats it (Trivy does, for some images)
        const list = [...new Set(cves[tool]?.vulns_by_package?.[pkg] ?? [])];
        byCve[tool] = list;
        if (list.length > 0) detectedBy.add(tool);
      }
      const purl = tools.map(tool => cves[tool]?.purl_mapping?.[pkg]).find(p => p !== undefined);
      const packageType = purl ? InferPkgTypeFromPurl(purl) : 'generic';
      return { pkg, packageType, byCve, detectedBy };
    })
    .sort((a, b) => b.detectedBy.size - a.detectedBy.size || a.pkg.localeCompare(b.pkg));
}

// two or more tools report the package, and they do not list the same CVEs for it
export function cvesDiffer(row: PackageRow): boolean {
  const lists = Array.from(row.detectedBy, tool => row.byCve[tool].slice().sort().join('\n'));
  return lists.length > 1 && new Set(lists).size > 1;
}

/**
 * For each tool, how many of its packages each CVE is reported on.
 * A CVE on several packages (e.g. one library behind several packages) gets a count above 1.
 */
export function countPackagesPerCve(cves: CVEReport, tools: string[]): Record<string, Map<string, number>> {
  const result: Record<string, Map<string, number>> = {};
  for (const tool of tools) {
    const counts = new Map<string, number>();
    for (const list of Object.values(cves[tool]?.vulns_by_package ?? {})) {
      for (const cve of new Set(list)) counts.set(cve, (counts.get(cve) ?? 0) + 1);
    }
    result[tool] = counts;
  }
  return result;
}

/** How many CVEs are reported on more than one package, from `countPackagesPerCve`. */
export function countRepeated(counts: Map<string, number>): number {
  let repeated = 0;
  for (const packages of counts.values()) if (packages > 1) repeated++;
  return repeated;
}

// a fix status as a short phrase: "fixed in 2.5", "fixed", "no fix", "will not fix", "fix deferred", or "fix unknown"
function fixPhrase(status: FixStatus, fixedVersion?: string): string {
  switch (status) {
    case 'fixed':
      return fixedVersion ? `fixed in ${fixedVersion}` : 'fixed';
    case 'not_fixed':
      return 'no fix';
    case 'wont_fix':
      return 'will not fix';
    case 'deferred':
      return 'fix deferred';
    default:
      return 'fix unknown';
  }
}

// a CVE's fix: the version is shown only when the packages agree on one (see settleFix in core)
export function fixText(detail?: VulnDetail): string | undefined {
  return detail ? fixPhrase(detail.status, detail.fixedVersion) : undefined;
}

// one package's fix: "fixed in X" only when the scanner lists exactly one fixed version for it, otherwise "fixed"
export function packageFixText(fix?: PackageFix): string | undefined {
  if (!fix) return undefined;
  return fixPhrase(fix.status, fix.fixedVersions.length === 1 ? fix.fixedVersions[0] : undefined);
}

/**
 * Package-CVE pairs of one tool's report: a CVE on three packages counts three times, and a CVE
 * repeated under one package counts once.
 */
export function countPackageCvePairs(report: VulnReport | undefined): number {
  return Object.values(report?.vulns_by_package ?? {}).reduce((sum, list) => sum + new Set(list).size, 0);
}

/**
 * Returns a map of tool name → number of CVEs reported by that tool.
 */
export function getPerToolCounts(cves: CVEReport): Record<string, number> {
  const result: Record<string, number> = {};
  for (const tool in cves) {
    const report = cves[tool] as VulnReport;
    result[tool] = report.cves?.length ?? 0;
  }
  return result;
}

/**
 * Returns a Set of all unique CVE IDs across all tools.
 */
export function getUniqueCveIds(cves: CVEReport): Set<string> {
  const ids = new Set<string>();
  for (const tool in cves) {
    const report = cves[tool] as VulnReport;
    if (Array.isArray(report.cves)) {
      for (const id of report.cves) {
        ids.add(id);
      }
    }
  }
  return ids;
}

/**
 * Returns the number of distinct packages that have at least one CVE.
 * A package is considered vulnerable if its entry in `vulns_by_package` has a non‑empty array.
 */
export function getVulnerablePackageCount(cves: CVEReport): number {
  const packages = new Set<string>();
  for (const tool in cves) {
    const report = cves[tool] as VulnReport;
    if (report.vulns_by_package) {
      for (const pkg in report.vulns_by_package) {
        const list = report.vulns_by_package[pkg];
        if (Array.isArray(list) && list.length > 0) {
          packages.add(pkg);
        }
      }
    }
  }
  return packages.size;
}

export function getUniqueCVEs(cves: CVEReport, tools: string[]): Set<string> {
  const ids = new Set<string>();
  for (const tool of tools) {
    for (const id of cves[tool]?.cves ?? []) ids.add(id);
  }
  return ids;
}

export function getVulnerablePackages(cves: CVEReport, tools: string[]): Set<string> {
  const pkgs = new Set<string>();
  for (const tool of tools) {
    for (const [pkg, list] of Object.entries(cves[tool]?.vulns_by_package ?? {})) {
      if (list.length > 0) pkgs.add(pkg);
    }
  }
  return pkgs;
}
