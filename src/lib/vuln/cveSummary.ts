import { CVEReport } from '@/lib/vuln/vulnLoader';
import { VulnReport } from '@/lib/vuln/vulnutils';

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
