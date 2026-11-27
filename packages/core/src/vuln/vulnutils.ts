import { PackageFix, VulnDetail, settleFix } from './vulnDetail';
import { TrivyVulnerability, trivyPackageFix, trivyVulnDetail } from './tools/trivy';
import { GrypeMatch, grypeCveId, grypePackageFix, grypeVulnDetail } from './tools/grype';
import { ScoutRule, scoutPackageFix, scoutVulnDetail } from './tools/scout';
import { comparisonKeyOfPurl } from '../translate/comparisonKeys';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VulnReport {
  totalCVEs: number;
  cves: string[];
  library: number;
  language: number;
  packagelist: string[];
  vulns_by_package: Record<string, string[]>;
  vulnpackagelist: Record<string, string[]>;
  purl_mapping: Record<string, string>;
  cveDetails?: Record<string, VulnDetail>;
  packageFixes?: Record<string, Record<string, PackageFix>>;
}

export function emptyReport(): VulnReport {
  return {
    totalCVEs: 0,
    cves: [],
    library: 0,
    language: 0,
    packagelist: [],
    vulns_by_package: {},
    vulnpackagelist: {},
    purl_mapping: {},
  };
}

// the fix one package has for one CVE; the first record for a (package, CVE) pair is kept
function recordPackageFix(report: VulnReport, pkg: string, cve: string, fix: PackageFix): void {
  report.packageFixes ??= {};
  const byCve = (report.packageFixes[pkg] ??= {});
  byCve[cve] ??= fix;
}

// the CVE-level fix is what its package fixes agree on (see settleFix); CVEs without package fixes keep theirs
function settleCveFixes(report: VulnReport): void {
  const perCve = new Map<string, PackageFix[]>();
  for (const byCve of Object.values(report.packageFixes ?? {})) {
    for (const [cve, fix] of Object.entries(byCve)) {
      const list = perCve.get(cve);
      if (list) list.push(fix);
      else perCve.set(cve, [fix]);
    }
  }
  for (const [cve, fixes] of perCve) {
    const detail = report.cveDetails?.[cve];
    if (!detail) continue;
    const settled = settleFix(fixes);
    detail.status = settled.status;
    detail.fixedVersion = settled.fixedVersion;
  }
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Constants / config (mirrors kernel.py and config.py imports)
// ---------------------------------------------------------------------------

// Provide these arrays as needed; kept empty here as placeholders.
export const LINUX_KERNEL: string[] = [];
export const LINUX_KERNEL_APK: string[] = [];

// ---------------------------------------------------------------------------
// PURL helpers
// ---------------------------------------------------------------------------

export function toComparableDebianPurl(purl: string): string {
  let version = purl.split('@')[1].split('?')[0];
  if (version.includes(':')) {
    version = version.split(':')[1];
  }
  if (purl.includes('golang')) {
    const parts = purl.split('/');
    if (parts.length > 3) {
      const ppurl = parts.slice(0, 3).join('/');
      return (
        ppurl.split('@')[0].replace('pkg:dpkg', 'pkg:deb/debian').toLowerCase() + '@' + version
      );
    }
  }
  let theoreticalPurl =
    purl.split('@')[0].replace('pkg:dpkg', 'pkg:deb/debian').toLowerCase() + '@' + version;
  if (!theoreticalPurl.includes('pkg:deb/debian') && theoreticalPurl.includes('pkg:deb')) {
    theoreticalPurl = theoreticalPurl.replace('pkg:deb', 'pkg:deb/debian');
  }
  return theoreticalPurl;
}

export function toComparableApk(purl: string): string {
  const parts = purl.split('@')[0].split('/');
  if (parts.length !== 3) {
    purl = purl.replace('pkg:apk/', 'pkg:apk/alpine/');
  }
  let version = purl.split('@')[1].split('?')[0];
  if (version.includes(':')) {
    version = version.split(':')[1];
  }
  return purl.split('@')[0] + '@' + version;
}

// the key a package is grouped by in the CVE comparison: the same key the SBOM comparison matches on
export function toComparablePurl(purl: string): string {
  const normalized = purl.replace(/^pkg:dpkg\//, 'pkg:deb/');
  return comparisonKeyOfPurl(normalized) ?? decodeURIComponent(normalized).toLowerCase().split('@')[0];
}

export function isDebian(purl: string): boolean {
  return purl.includes('pkg:dpkg') || purl.includes('pkg:deb');
}

export function isOspkg(purl: string): boolean {
  return purl.startsWith('pkg:deb');
}

export function isOspkgApk(purl: string): boolean {
  return purl.startsWith('pkg:apk');
}

export function isKernelPackage(purl: string): boolean {
  if (purl.split('@')[0] === 'pkg:deb/debian/linux') return true;
  for (const pkg of LINUX_KERNEL) {
    if (purl.includes(`deb/debian/${pkg}`)) return true;
  }
  return false;
}

export function isKernelPackageApk(purl: string): boolean {
  if (/^pkg:apk\/[^/]+\/linux$/.test(purl)) return true;
  if (purl.includes('linux-firmware')) return true;
  for (const pkg of LINUX_KERNEL_APK) {
    if (purl.includes(pkg + '@')) return true;
  }
  return false;
}

export function getPurlType(purl: string): 0 | 1 {
  if (purl.includes('debian')) return 0;
  if (purl.includes('ubuntu')) return 0;
  if (purl.includes('pypi')) return 1;
  if (purl.includes('apk')) return 0;
  if (purl.includes('golang')) return 1;
  if (purl.includes('maven')) return 1;
  if (purl.includes('rpm')) return 0;
  if (purl.includes('npm')) return 1;
  if (purl.includes('cargo')) return 1;
  if (purl.includes('nuget')) return 1;
  if (purl.includes('gem')) return 1;
  if (purl.includes('composer')) return 1;
  if (purl.includes('generic')) return 1;
  throw new Error(`Unknown purl type: ${purl}`);
}

export function getUpstreamFromPurl(purl: string): [string | null, string | null] {
  let possibleUpstream: string | null = null;
  let version: string | null = null;

  if (purl.includes('upstream=')) {
    let upstream = purl.split('upstream=')[1].split('&')[0];
    upstream = upstream.replace(/%40/g, '@').replace(/%2b/gi, '+');
    const ups = upstream.split('@');
    upstream = ups[0].trimEnd();
    if (ups.length === 2) version = ups[1].trimEnd();

    const maybeUp = purl.split('@')[0].split('/').pop() ?? '';
    if (upstream !== maybeUp) {
      possibleUpstream = 'pkg:deb/debian/' + upstream;
    }
  }
  return [possibleUpstream, version];
}

export function purl2Upstream(purl: string): string {
  if (purl.includes('upstream=')) {
    const upstreamEncoded = purl.split('upstream=')[1].split('&')[0];
    const upstreamDecoded = decodeURIComponent(upstreamEncoded);
    return upstreamDecoded.split('@')[0];
  } else {
    const mainPart = purl.split('@')[0];
    return mainPart.split('/').pop() ?? '';
  }
}

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

export function extractTrivyVulnerabilities(obj: Record<string, unknown>, _: unknown): VulnReport {
  const report = emptyReport();

  if (!obj['Results']) return report;

  for (const result of obj['Results'] as Record<string, unknown>[]) {
    if (!result['Vulnerabilities']) continue;
    for (const vulnerability of result['Vulnerabilities'] as Record<string, unknown>[]) {
      const purl = (vulnerability['PkgIdentifier'] as Record<string, string>)['PURL'];
      const id = vulnerability['VulnerabilityID'] as string;
      const comparablePurl = toComparablePurl(purl);
      report.purl_mapping[comparablePurl] = purl;
      if (!report.vulns_by_package[comparablePurl]) {
        report.vulns_by_package[comparablePurl] = [id];
      } else {
        report.vulns_by_package[comparablePurl].push(id);
      }
      report.cves.push(id);
      report.totalCVEs += 1;
      if (getPurlType(purl) === 0) report.library += 1;
      else report.language += 1;
      report.cveDetails ??= {};
      report.cveDetails[id] ??= trivyVulnDetail(vulnerability as TrivyVulnerability);
      recordPackageFix(report, comparablePurl, id, trivyPackageFix(vulnerability as TrivyVulnerability));
    }
  }

  console.assert(report.totalCVEs === report.cves.length);
  console.assert(
    Object.values(report.vulns_by_package).reduce((s, v) => s + v.length, 0) === report.totalCVEs
  );
  settleCveFixes(report);
  report.vulnpackagelist = deepClone(report.vulns_by_package);
  return report;
}

export function extractAnchoreVulnerabilities(
  obj: Record<string, unknown>,
  _: unknown
): VulnReport {
  const vuln_report = emptyReport();
  const vulns_by_package: Record<string, string[]> = {};
  const seenCVEs = new Set<string>(); // ✅ global dedup

  if (!obj['matches']) return vuln_report;

  for (const match of obj['matches'] as Record<string, unknown>[]) {
    if (!match['vulnerability']) continue;

    const vuln = match['vulnerability'] as Record<string, string>;
    const vuln_id = grypeCveId(match as GrypeMatch);
    const namespace = vuln['namespace'];

    const purl = (match['artifact'] as Record<string, string>)['purl'];
    const comparablePurl = toComparablePurl(purl);

    // Always update mapping (idempotent)
    vuln_report.purl_mapping[comparablePurl] = purl;

    // --- per-package dedup ---
    if (!vulns_by_package[comparablePurl]) {
      vulns_by_package[comparablePurl] = [vuln_id];
    } else if (!vulns_by_package[comparablePurl].includes(vuln_id)) {
      vulns_by_package[comparablePurl].push(vuln_id);
    }

    // every match carries its own fix for its package, so each package keeps its own
    recordPackageFix(vuln_report, comparablePurl, vuln_id, grypePackageFix(match as GrypeMatch));

    // --- global dedup ---
    if (seenCVEs.has(vuln_id)) continue;

    seenCVEs.add(vuln_id);

    vuln_report.cveDetails ??= {};
    vuln_report.cveDetails[vuln_id] = grypeVulnDetail(match as GrypeMatch);

    vuln_report.cves.push(vuln_id);
    vuln_report.totalCVEs += 1;

    if (namespace.includes('distro')) {
      vuln_report.library += 1;
    } else if (namespace.includes('language')) {
      vuln_report.language += 1;
    } else if (namespace !== 'nvd:cpe') {
      console.warn(`Unknown namespace: ${namespace}`);
    }
  }

  settleCveFixes(vuln_report);

  // Consistency check
  console.assert(vuln_report.totalCVEs === vuln_report.cves.length);

  const sum = Object.values(vulns_by_package).reduce((s, v) => s + v.length, 0);

  if (sum < vuln_report.totalCVEs) {
    throw new Error('Invariant violated: package counts < total CVEs');
  }

  vuln_report.vulns_by_package = vulns_by_package;
  vuln_report.vulnpackagelist = vulns_by_package;

  return vuln_report;
}

// Docker Scout's SARIF: each result points at a rule, one per CVE, whose purls are the packages it affects.
export function extractScoutVulnerabilities(obj: Record<string, unknown>, _: unknown): VulnReport {
  const report = emptyReport();
  const run = ((obj['runs'] as Record<string, unknown>[] | undefined) ?? [])[0] as
    | {
        tool: { driver: { rules?: ScoutRule[] } };
        results?: { ruleId: string }[];
      }
    | undefined;
  if (!run) return report;

  const rules = new Map((run.tool.driver.rules ?? []).map(rule => [rule.id, rule]));
  // Scout repeats a rule's result once per location: the rule's purls are counted once
  const seen = new Set<string>();
  for (const result of run.results ?? []) {
    const rule = rules.get(result.ruleId);
    if (!rule || seen.has(rule.id)) continue;
    seen.add(rule.id);
    const detail = scoutVulnDetail(rule);
    report.cveDetails ??= {};
    report.cveDetails[detail.id] ??= detail;
    for (const purl of rule.properties.purls ?? []) {
      const comparablePurl = toComparablePurl(purl);
      report.purl_mapping[comparablePurl] = purl;
      recordPackageFix(report, comparablePurl, detail.id, scoutPackageFix(rule));
      (report.vulns_by_package[comparablePurl] ??= []).push(detail.id);
      report.cves.push(detail.id);
      report.totalCVEs += 1;
      if (getPurlType(purl) === 0) report.library += 1;
      else report.language += 1;
    }
  }

  settleCveFixes(report);
  report.vulnpackagelist = deepClone(report.vulns_by_package);
  return report;
}

export const VULN_EXTRACTORS: Record<
  string,
  (obj: Record<string, unknown>, purlMapping: Record<string, string>) => VulnReport
> = {
  trivy: extractTrivyVulnerabilities,
  grype: extractAnchoreVulnerabilities,
  scout: extractScoutVulnerabilities,
};

// ---------------------------------------------------------------------------
// Remove / filter helpers
// ---------------------------------------------------------------------------

function filterCves(cves: string[]): string[] {
  return cves.filter(cve => cve.split('-')[0] !== 'TEMP' && cve.split('-')[1] !== '2025');
}

export function removeLanguageDebian(data: VulnReport): VulnReport {
  const retval = deepClone(data);
  const total_vulns: string[] = [];
  retval.vulns_by_package = {};
  retval.vulnpackagelist = {};
  retval.purl_mapping = Object.fromEntries(
    Object.entries(data.purl_mapping).filter(([k]) => isOspkg(k))
  );

  for (const [k, v] of Object.entries(data.vulns_by_package)) {
    if (isOspkg(k)) {
      const newv = filterCves(v);
      if (newv.length) {
        retval.vulns_by_package[k] = newv;
        total_vulns.push(...newv);
      }
    }
  }
  for (const [k, v] of Object.entries(data.vulnpackagelist)) {
    if (isOspkg(k)) {
      const newv = filterCves(v);
      if (newv.length) retval.vulnpackagelist[k] = newv;
    }
  }
  retval.totalCVEs = total_vulns.length;
  retval.cves = total_vulns;
  return retval;
}

export function removeLanguageApk(data: VulnReport): VulnReport {
  const retval = deepClone(data);
  const total_vulns: string[] = [];
  retval.vulns_by_package = {};
  retval.vulnpackagelist = {};
  retval.purl_mapping = Object.fromEntries(
    Object.entries(data.purl_mapping).filter(([k]) => isOspkgApk(k))
  );

  for (const [k, v] of Object.entries(data.vulns_by_package)) {
    if (isOspkgApk(k)) {
      const newv = filterCves(v);
      if (newv.length) {
        retval.vulns_by_package[k] = newv;
        total_vulns.push(...newv);
      }
    }
  }
  for (const [k, v] of Object.entries(data.vulnpackagelist)) {
    if (isOspkgApk(k)) {
      const newv = filterCves(v);
      if (newv.length) retval.vulnpackagelist[k] = newv;
    }
  }
  retval.totalCVEs = total_vulns.length;
  retval.cves = total_vulns;
  return retval;
}

export function removeLanguage(data: VulnReport): VulnReport {
  const keys = Object.keys(data.purl_mapping);
  if (keys.length === 0) return data;
  if (keys.some(k => k?.includes('pkg:deb/') || k?.includes('pkg:dpkg/'))) {
    return removeLanguageDebian(data);
  }
  return removeLanguageApk(data);
}

export function removeKernelAndLanguageDebian(data: VulnReport): VulnReport {
  const retval = deepClone(data);
  const total_vulns: string[] = [];
  retval.vulns_by_package = {};
  retval.vulnpackagelist = {};
  retval.purl_mapping = Object.fromEntries(
    Object.entries(data.purl_mapping).filter(([k]) => isOspkg(k) && !isKernelPackage(k))
  );
  retval.packagelist = data.packagelist.filter(k => isOspkg(k) && !isKernelPackage(k));

  for (const [k, v] of Object.entries(data.vulns_by_package)) {
    if (isOspkg(k) && !isKernelPackage(k)) {
      const newv = filterCves(v);
      if (newv.length) retval.vulns_by_package[k] = newv;
      total_vulns.push(...newv);
    }
  }
  for (const [k, v] of Object.entries(data.vulnpackagelist)) {
    if (isOspkg(k) && !isKernelPackage(k)) {
      const newv = filterCves(v);
      if (newv.length) retval.vulnpackagelist[k] = newv;
    }
  }
  retval.totalCVEs = total_vulns.length;
  retval.cves = total_vulns;
  return retval;
}

export function removeKernelAndLanguageApk(data: VulnReport): VulnReport {
  const retval = deepClone(data);
  const total_vulns: string[] = [];
  retval.vulns_by_package = {};
  retval.vulnpackagelist = {};
  retval.purl_mapping = Object.fromEntries(
    Object.entries(data.purl_mapping).filter(([k]) => isOspkgApk(k) && !isKernelPackageApk(k))
  );
  retval.packagelist = data.packagelist.filter(k => isOspkgApk(k) && !isKernelPackageApk(k));

  for (const [k, v] of Object.entries(data.vulns_by_package)) {
    if (isOspkgApk(k) && !isKernelPackageApk(k)) {
      const newv = filterCves(v);
      if (newv.length) retval.vulns_by_package[k] = newv;
      total_vulns.push(...newv);
    }
  }
  for (const [k, v] of Object.entries(data.vulnpackagelist)) {
    if (isOspkgApk(k) && !isKernelPackageApk(k)) {
      const newv = filterCves(v);
      if (newv.length) retval.vulnpackagelist[k] = newv;
    }
  }
  retval.totalCVEs = total_vulns.length;
  retval.cves = total_vulns;
  return retval;
}

export function removeKernelAndLanguage(data: VulnReport): VulnReport {
  const keys = Object.keys(data.purl_mapping);
  if (keys.length === 0) return data;
  if (keys.some(k => k?.includes('pkg:deb/') || k?.includes('pkg:dpkg/'))) {
    return removeKernelAndLanguageDebian(data);
  }
  return removeKernelAndLanguageApk(data);
}

export function removeOspkg(data: VulnReport): VulnReport {
  const retval = deepClone(data);
  const total_vulns: string[] = [];
  retval.vulns_by_package = {};
  retval.purl_mapping = Object.fromEntries(
    Object.entries(data.purl_mapping).filter(([k]) => !isOspkg(k))
  );
  for (const [k, v] of Object.entries(data.vulns_by_package)) {
    if (!isOspkg(k)) {
      retval.vulns_by_package[k] = v;
      total_vulns.push(...v);
    }
  }
  retval.totalCVEs = total_vulns.length;
  retval.cves = total_vulns;
  return retval;
}

export function harmonizeEncoding(data: VulnReport): VulnReport {
  const retval = deepClone(data);
  for (const k of Object.keys(data.purl_mapping)) {
    const newk = k.replace(/%2b/gi, '+').replace(/%40/gi, '@');
    const v = retval.purl_mapping[k];
    delete retval.purl_mapping[k];
    retval.purl_mapping[newk] = v;
    if (k in data.vulns_by_package) {
      const vv = retval.vulns_by_package[k];
      delete retval.vulns_by_package[k];
      retval.vulns_by_package[newk] = vv;
    }
  }
  return retval;
}

// ---------------------------------------------------------------------------
// Analysis helpers
// ---------------------------------------------------------------------------

export function splitCommonAndNoncommonPackages(
  baseNokernel: Record<string, VulnReport>
): [Set<string>, Record<string, number>] {
  const tool_keys = Object.keys(baseNokernel).filter(k => k.split('-')[0] === k.split('-')[1]);
  const pkgsPerTool = tool_keys.map(k => new Set(Object.keys(baseNokernel[k].purl_mapping)));

  const common = setIntersection(...pkgsPerTool);
  const allPkgs = pkgsPerTool.flatMap(s => [...s]);
  const counts: Record<string, number> = {};
  for (const pkg of allPkgs) counts[pkg] = (counts[pkg] ?? 0) + 1;
  const nonCommon = Object.fromEntries(Object.entries(counts).filter(([pkg]) => !common.has(pkg)));
  return [common, nonCommon];
}

export function splitCommonAndNoncommonPackagesWithVulns(
  baseNokernel: Record<string, VulnReport>
): [Set<string>, Record<string, number>] {
  const tool_keys = Object.keys(baseNokernel).filter(k => k.split('-')[0] === k.split('-')[1]);
  const pkgsPerTool = tool_keys.map(k => new Set(Object.keys(baseNokernel[k].vulns_by_package)));
  const common = setIntersection(...pkgsPerTool);
  const allPkgs = pkgsPerTool.flatMap(s => [...s]);
  const counts: Record<string, number> = {};
  for (const pkg of allPkgs) counts[pkg] = (counts[pkg] ?? 0) + 1;
  const nonCommon = Object.fromEntries(Object.entries(counts).filter(([pkg]) => !common.has(pkg)));
  return [common, nonCommon];
}

function setIntersection<T>(...sets: Set<T>[]): Set<T> {
  if (sets.length === 0) return new Set();
  let result = new Set(sets[0]);
  for (const s of sets.slice(1)) {
    result = new Set([...result].filter(x => s.has(x)));
  }
  return result;
}

export function convertVulnPkgsInCvesInPkgs(
  db: Record<string, VulnReport>
): Record<string, Record<string, Set<string>>> {
  const result: Record<string, Record<string, Set<string>>> = {};
  for (const [testbed, report] of Object.entries(db)) {
    result[testbed] = {};
    for (const [pkg, cves] of Object.entries(report.vulns_by_package)) {
      for (const cve of cves) {
        if (!result[testbed][cve]) result[testbed][cve] = new Set();
        result[testbed][cve].add(pkg);
      }
    }
  }
  return result;
}

export function convertVulnPkgsListInCvesInPkgs(
  db: Record<string, VulnReport>
): Record<string, Record<string, Set<string>>> {
  const result: Record<string, Record<string, Set<string>>> = {};
  for (const [testbed, report] of Object.entries(db)) {
    result[testbed] = {};
    for (const [pkg, cves] of Object.entries(report.vulnpackagelist)) {
      for (const cve of cves) {
        if (!result[testbed][cve]) result[testbed][cve] = new Set();
        result[testbed][cve].add(pkg);
      }
    }
  }
  return result;
}

export function upstreamPkgs(data: Record<string, VulnReport>): Record<string, string[]> {
  const anchore_mappings = data['anchore-anchore'].purl_mapping;
  const upstreams: Record<string, string[]> = {};
  for (const [id, purl] of Object.entries(anchore_mappings)) {
    const upstream = purl2Upstream(purl);
    if (!upstreams[upstream]) upstreams[upstream] = [];
    upstreams[upstream].push(id);
  }
  return upstreams;
}

export function getUpstream(db: Record<string, VulnReport>, initialTool: string): string[] {
  const result: string[] = [];
  for (const [, purl] of Object.entries(db[initialTool].purl_mapping)) {
    const [possibleUpstream] = getUpstreamFromPurl(purl);
    if (possibleUpstream && !(possibleUpstream in db[initialTool].purl_mapping)) {
      result.push(possibleUpstream);
    }
  }
  return [...new Set(result)];
}

export function getPkgInfoFromPurl(
  pkg: string,
  baseNokernel: Record<string, VulnReport>
): [string, string] {
  const tools = Object.keys(baseNokernel);
  if (!tools.some(t => pkg in baseNokernel[t].purl_mapping)) {
    throw new Error(`${pkg} not found in any tool`);
  }

  let complete_purl: string;
  if (!(pkg in baseNokernel['anchore-anchore'].purl_mapping)) {
    if (pkg in baseNokernel['docker-docker'].purl_mapping) {
      complete_purl = baseNokernel['docker-docker'].purl_mapping[pkg];
    } else {
      for (const tool of tools) {
        if (pkg in baseNokernel[tool].purl_mapping) {
          complete_purl = baseNokernel[tool].purl_mapping[pkg];
        }
      }
    }
  } else {
    complete_purl = baseNokernel['anchore-anchore'].purl_mapping[pkg];
  }

  const tool = complete_purl!.split('@')[0].split('/').pop() ?? '';
  let version = complete_purl!.split('@')[1].split('?')[0].replace(/%2B/gi, '+');

  const [cup, cvers] = getUpstreamFromPurl(complete_purl!);
  const name = cup ? cup.split('/').pop()!.replace(/%2B/gi, '+') : tool;
  if (cvers !== null) version = cvers;
  return [name, version];
}
