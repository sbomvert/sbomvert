import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

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
}

function emptyReport(): VulnReport {
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
  let version = purl.split("@")[1].split("?")[0];
  if (version.includes(":")) {
    version = version.split(":")[1];
  }
  if (purl.includes("golang")) {
    const parts = purl.split("/");
    if (parts.length > 3) {
      const ppurl = parts.slice(0, 3).join("/");
      return (
        ppurl.split("@")[0].replace("pkg:dpkg", "pkg:deb/debian").toLowerCase() +
        "@" +
        version
      );
    }
  }
  let theoreticalPurl =
    purl.split("@")[0].replace("pkg:dpkg", "pkg:deb/debian").toLowerCase() +
    "@" +
    version;
  if (!theoreticalPurl.includes("pkg:deb/debian") && theoreticalPurl.includes("pkg:deb")) {
    theoreticalPurl = theoreticalPurl.replace("pkg:deb", "pkg:deb/debian");
  }
  return theoreticalPurl;
}

export function toComparableApk(purl: string): string {
  const parts = purl.split("@")[0].split("/");
  if (parts.length !== 3) {
    purl = purl.replace("pkg:apk/", "pkg:apk/alpine/");
  }
  let version = purl.split("@")[1].split("?")[0];
  if (version.includes(":")) {
    version = version.split(":")[1];
  }
  return purl.split("@")[0] + "@" + version;
}

export function toComparablePurl(purl: string): string {
  const unquotedPurl = decodeURIComponent(purl).toLowerCase();
  if (purl.includes("pkg:dpkg") || purl.includes("pkg:deb")) {
    return toComparableDebianPurl(unquotedPurl);
  } else if (purl.includes("pkg:apk/")) {
    return toComparableApk(unquotedPurl);
  } else {
    return unquotedPurl.split("@")[0];
  }
}

export function isDebian(purl: string): boolean {
  return purl.includes("pkg:dpkg") || purl.includes("pkg:deb");
}

export function isOspkg(purl: string): boolean {
  return purl.startsWith("pkg:deb");
}

export function isOspkgApk(purl: string): boolean {
  return purl.startsWith("pkg:apk");
}

export function isKernelPackage(purl: string): boolean {
  if (purl.split("@")[0] === "pkg:deb/debian/linux") return true;
  for (const pkg of LINUX_KERNEL) {
    if (purl.includes(`deb/debian/${pkg}`)) return true;
  }
  return false;
}

export function isKernelPackageApk(purl: string): boolean {
  if (/^pkg:apk\/[^/]+\/linux$/.test(purl)) return true;
  if (purl.includes("linux-firmware")) return true;
  for (const pkg of LINUX_KERNEL_APK) {
    if (purl.includes(pkg + "@")) return true;
  }
  return false;
}

export function getPurlType(purl: string): 0 | 1 {
  if (purl.includes("debian")) return 0;
  if (purl.includes("ubuntu")) return 0;
  if (purl.includes("pypi")) return 1;
  if (purl.includes("apk")) return 0;
  if (purl.includes("golang")) return 1;
  if (purl.includes("maven")) return 1;
  if (purl.includes("rpm")) return 0;
  if (purl.includes("npm")) return 1;
  if (purl.includes("cargo")) return 1;
  if (purl.includes("nuget")) return 1;
  if (purl.includes("gem")) return 1;
  if (purl.includes("composer")) return 1;
  if (purl.includes("generic")) return 1;
  throw new Error(`Unknown purl type: ${purl}`);
}

export function getUpstreamFromPurl(purl: string): [string | null, string | null] {
  let possibleUpstream: string | null = null;
  let version: string | null = null;

  if (purl.includes("upstream=")) {
    let upstream = purl.split("upstream=")[1].split("&")[0];
    upstream = upstream
      .replace(/%40/g, "@")
      .replace(/%2b/gi, "+");
    const ups = upstream.split("@");
    upstream = ups[0].trimEnd();
    if (ups.length === 2) version = ups[1].trimEnd();

    const maybeUp = purl.split("@")[0].split("/").pop() ?? "";
    if (upstream !== maybeUp) {
      possibleUpstream = "pkg:deb/debian/" + upstream;
    }
  }
  return [possibleUpstream, version];
}

export function purl2Upstream(purl: string): string {
  if (purl.includes("upstream=")) {
    const upstreamEncoded = purl.split("upstream=")[1].split("&")[0];
    const upstreamDecoded = decodeURIComponent(upstreamEncoded);
    return upstreamDecoded.split("@")[0];
  } else {
    const mainPart = purl.split("@")[0];
    return mainPart.split("/").pop() ?? "";
  }
}

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

export function extractTrivyVulnerabilities(
  obj: Record<string, unknown>,
  _: unknown
): VulnReport {
  const report = emptyReport();

  if (!obj["Results"]) return report;

  for (const result of obj["Results"] as Record<string, unknown>[]) {
    if (!result["Vulnerabilities"]) continue;
    for (const vulnerability of result["Vulnerabilities"] as Record<string, unknown>[]) {
      const purl = (vulnerability["PkgIdentifier"] as Record<string, string>)["PURL"];
      const id = vulnerability["VulnerabilityID"] as string;
      if (isDebian(purl)) continue;

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
    }
  }

  console.assert(report.totalCVEs === report.cves.length);
  console.assert(
    Object.values(report.vulns_by_package).reduce((s, v) => s + v.length, 0) ===
      report.totalCVEs
  );
  report.vulnpackagelist = deepClone(report.vulns_by_package);
  return report;
}

export function extractAnchoreVulnerabilities(
  obj: Record<string, unknown>,
   _: unknown
): VulnReport {
  const vuln_report = emptyReport();
  const vulns_by_package: Record<string, string[]> = {};

  if (!obj["matches"]) return vuln_report;

  for (const match of obj["matches"] as Record<string, unknown>[]) {
    if (!match["vulnerability"]) continue;
    const vuln = match["vulnerability"] as Record<string, string>;
    const vuln_id = vuln["id"];
    const purl = (match["artifact"] as Record<string, string>)["purl"];

    const comparablePurl = toComparablePurl(purl);
    vuln_report.purl_mapping[comparablePurl] = purl;

    if (!vulns_by_package[comparablePurl]) {
      vulns_by_package[comparablePurl] = [vuln_id];
    } else if (vulns_by_package[comparablePurl].includes(vuln_id)) {
      continue;
    } else {
      vulns_by_package[comparablePurl].push(vuln_id);
    }

    vuln_report.cves.push(vuln_id);
    const namespace = vuln["namespace"];
    vuln_report.totalCVEs += 1;
    if (namespace.includes("distro")) vuln_report.library += 1;
    else if (namespace.includes("language")) vuln_report.language += 1;
    else if (namespace !== "nvd:cpe") console.warn(`Unknown namespace: ${namespace}`);
    // nvd:cpe entries are counted but skipped for distro/lang stats
  }

  console.assert(vuln_report.totalCVEs === vuln_report.cves.length);
  const sum = Object.values(vulns_by_package).reduce((s, v) => s + v.length, 0);
  if (sum !== vuln_report.totalCVEs)
    throw new Error("Sum of vulns_by_package values does not match totalCVEs");

  vuln_report.vulns_by_package = vulns_by_package;
  vuln_report.vulnpackagelist = vulns_by_package;
  return vuln_report;
}
/*
export function extractDockerVulnerabilities(
  obj: Record<string, unknown>,
  _: unknown
): VulnReport {
  const report = emptyReport();
  const db = new Database(DB_CVES, { readonly: true });

  if (!obj["runs"]) return report;

  for (const run of obj["runs"] as Record<string, unknown>[]) {
    for (const result of (run["tool"] as Record<string, unknown>)["driver"] as Record<
      string,
      unknown[]
    >)["rules"] as Record<string, unknown>[]) {
      report.totalCVEs += 1;
      const vid = result["id"] as string;
      const purl = (result["properties"] as Record<string, string[]>)["purls"][0];
      if (!vid.startsWith("CVE")) continue;
      if (vid.startsWith("CVE-2025")) continue;
      if (isDebian(purl) && !debianCveExists(db, vid)) continue;

      report.cves.push(vid);
      const comparablePurl = toComparablePurl(purl);
      report.purl_mapping[comparablePurl] = purl;
      if (!report.vulns_by_package[comparablePurl]) {
        report.vulns_by_package[comparablePurl] = [vid];
      } else {
        report.vulns_by_package[comparablePurl].push(vid);
      }
      if (getPurlType(purl) === 0) report.library += 1;
      else report.language += 1;
    }
  }

  report.vulnpackagelist = deepClone(report.vulns_by_package);
  db.close();
  return report;
}
*/
/*
export function extractAmazonVulnerabilities(obj: Record<string, unknown>): VulnReport {
  const report = emptyReport();
  const db = new Database(DB_CVES, { readonly: true });

  for (const pkg of obj["packages"] as Record<string, unknown>[]) {
    let the_purl = "";
    let cves: string[] = [];
    const refs = pkg["externalRefs"] as Record<string, string>[];

    if (refs.length === 1) {
      const ref = refs[0];
      console.assert(ref["referenceType"] === "purl");
      the_purl = toComparablePurl(ref["referenceLocator"]);
      report.purl_mapping[the_purl] = ref["referenceLocator"];
      if (getPurlType(the_purl) === 0) report.library += 1;
      else report.language += 1;
    } else {
      const ref = refs[0];
      console.assert(ref["referenceType"] === "purl");
      the_purl = toComparablePurl(ref["referenceLocator"]);
      report.purl_mapping[the_purl] = ref["referenceLocator"];
      if (getPurlType(the_purl) === 0) report.library += 1;
      else report.language += 1;
      for (const otherref of refs.slice(1)) {
        if (otherref["referenceType"] !== "vulnerability") continue;
        if (report.cves.includes(otherref["referenceLocator"])) continue;
        cves.push(otherref["referenceLocator"]);
      }
    }

    if (cves.length) {
      if (isDebian(the_purl)) {
        cves = cves.filter((vid) => debianCveExists(db, vid));
      }
      report.cves.push(...cves);
      report.totalCVEs += cves.length;
      if (the_purl in report.vulns_by_package) {
        report.vulns_by_package[the_purl].push(...cves);
      } else {
        report.vulns_by_package[the_purl] = [...cves];
      }
    }
  }

  report.vulnpackagelist = deepClone(report.vulns_by_package);
  report.cves = [...new Set(report.cves)];

  db.close();
  return report;
}

export function extractGcloudVulnerabilities(
  obj: unknown[],
  purlMapping: Record<string, string>,
  enrichedPurlMapping: Record<string, string>
): VulnReport {
  const report = emptyReport();
  const db = new Database(DB_CVES, { readonly: true });
  const base_os = Object.keys(purlMapping)[0].split("/").slice(0, 2).join("/");

  for (const pkg of obj) {
    if (!pkg) continue;
    const pkgRec = pkg as Record<string, unknown>;
    const vuln = (pkgRec["occurrence"] as Record<string, unknown>)["vulnerability"] as Record<
      string,
      unknown
    >;
    const vid = vuln["shortDescription"] as string;
    const issue = vuln["packageIssue"] as Record<string, unknown>;

    const packageType = issue["packageType"] as string;

    if (packageType === "OS") {
      const affVersion = (issue["affectedVersion"] as Record<string, string>)["fullName"];
      const ppurl = `${base_os}/${issue["affectedPackage"]}@${affVersion}`;
      let exp_purl = [ppurl];
      report.library += 1;
      report.totalCVEs += 1;
      if (!vid.startsWith("CVE")) continue;
      if (vid.startsWith("CVE-2025")) continue;
      if (isDebian(ppurl) && !debianCveExists(db, vid)) continue;

      if (!report.vulnpackagelist[ppurl]) report.vulnpackagelist[ppurl] = [vid];
      else report.vulnpackagelist[ppurl].push(vid);

      if (!(exp_purl[0] in purlMapping)) {
        exp_purl = [];
        for (const [comp_purl, complete_purl] of Object.entries(enrichedPurlMapping)) {
          if (complete_purl.includes(`upstream=${issue["affectedPackage"]}`)) {
            exp_purl.push(comp_purl);
          }
        }
      }

      for (const purl of exp_purl) {
        if (!(purl in purlMapping))
          throw new Error(`${purl} not in gcloud - ${issue["affectedPackage"]}`);
        report.cves.push(vid);
        if (!report.vulns_by_package[purl]) report.vulns_by_package[purl] = [vid];
        else report.vulns_by_package[purl].push(vid);
      }
    } else {
      let purl: string;
      if (packageType === "PYPI") purl = `pkg:pypi/${issue["affectedPackage"]}`;
      else if (packageType === "GO") purl = `pkg:golang/${issue["affectedPackage"]}`;
      else if (packageType === "GO_STDLIB") purl = "pkg:golang/stdlib";
      else if (packageType === "NPM") purl = `pkg:npm/${issue["affectedPackage"]}`;
      else if (packageType === "COMPOSER") purl = `pkg:composer/${issue["affectedPackage"]}`;
      else if (packageType === "RUBYGEMS") purl = `pkg:ruby/${issue["affectedPackage"]}`;
      else {
        console.error(`[Gcloud] Unknown type: ${packageType}`);
        report.language += 1;
        report.totalCVEs += 1;
        continue;
      }
      report.language += 1;
      report.totalCVEs += 1;
      if (!report.vulns_by_package[purl]) report.vulns_by_package[purl] = [vid];
      else report.vulns_by_package[purl].push(vid);
    }
  }

  report.purl_mapping = purlMapping;
  db.close();
  return report;
}

export function extractMicrosoftVulnerabilities(
  obj: Record<string, unknown>[],
  _container: string,
  purlMapping: Record<string, string>,
  enrichedPurlMapping: Record<string, string>
): VulnReport {
  const report = emptyReport();
  const db = new Database(DB_CVES, { readonly: true });
  const base_os = Object.keys(purlMapping)[0].split("/").slice(0, 2).join("/");

  for (const pkg of obj) {
    const cve = pkg["cveId"] as string;
    const cat = pkg["subAssessmentCategory"] as string;
    report.cves.push(cve);

    if (cat === "Language") {
      report.language += 1;
      report.totalCVEs += 1;
    } else if (cat === "OS") {
      const purl = `${base_os}/${pkg["pname"]}`;
      if (!cve.startsWith("CVE")) continue;
      if (cve.startsWith("CVE-2025")) continue;
      if (isDebian(purl) && !debianCveExists(db, cve)) continue;

      if (!report.vulnpackagelist[purl]) report.vulnpackagelist[purl] = [cve];
      else report.vulnpackagelist[purl].push(cve);

      report.library += 1;
      report.totalCVEs += 1;

      let candidates: string[] = [];
      for (const p of Object.keys(purlMapping)) {
        if (p.startsWith(purl + "@")) candidates.push(p);
      }
      if (candidates.length === 0) {
        for (const [comp_purl, complete_purl] of Object.entries(enrichedPurlMapping)) {
          if (complete_purl.includes(`upstream=${pkg["pname"]}`)) {
            candidates.push(comp_purl);
          }
        }
      }
      for (const p of candidates) {
        if (!report.vulns_by_package[p]) report.vulns_by_package[p] = [cve];
        else report.vulns_by_package[p].push(cve);
      }
    } else {
      throw new Error("Should not be here");
    }
  }

  report.purl_mapping = purlMapping;
  db.close();
  return report;
}
*/
export const VULN_EXTRACTORS: Record<
  string,
  (obj: Record<string, unknown>, purlMapping: Record<string, string>) => VulnReport
> = {
  trivy: extractTrivyVulnerabilities,
  grype: extractAnchoreVulnerabilities,
  syft: extractAnchoreVulnerabilities,
  //scout: extractDockerVulnerabilities,
};

// ---------------------------------------------------------------------------
// PURL mapping helpers
// ---------------------------------------------------------------------------

export function getPurlMappings(file: string): [Record<string, string>, Record<string, unknown>] {
  const purlMappings: Record<string, string> = {};
  const packagesWithoutPurl: Record<string, unknown> = {};
  const sbom = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;

  for (const pkg of sbom["packages"] as Record<string, unknown>[]) {
    if ("externalRefs" in pkg) {
      for (const ref of pkg["externalRefs"] as Record<string, string>[]) {
        const purl = ref["referenceLocator"];
        if (ref["referenceType"] === "purl" && !purl.startsWith("pkg:oci")) {
          const loc = toComparablePurl(purl);
          if (file.includes("/syft") && (purl.includes("apk") || purl.includes("deb"))) {
            const sourceInfo = (pkg["sourceInfo"] as string) ?? "";
            if (
              sourceInfo.includes("/var/lib/dpkg/status") ||
              sourceInfo.includes("/lib/apk/db/installed")
            ) {
              purlMappings[loc] = purl;
            }
          } else {
            purlMappings[loc] = purl;
          }
        }
      }
    } else {
      packagesWithoutPurl[(pkg["name"] as string) ?? ""] = pkg;
    }
  }

  return [purlMappings, packagesWithoutPurl];
}

export function constructPurlMappings(
  file: string,
  type: "alpine" | "debian" | string
): Record<string, string> {
  const purlMappings: Record<string, string> = {};
  const sbom = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
  const packages = sbom["packages"] as Record<string, unknown>[];

  if (packages.length < 2) {
    throw new Error(`SBOM file is empty: ${file}`);
  }

  const base_os = type === "alpine" ? "pkg:apk/alpine" : "pkg:deb/debian";
  for (const pkg of packages) {
    const purl = `${base_os}/${pkg["name"]}@${pkg["versionInfo"]}`;
    const loc = toComparablePurl(purl);
    purlMappings[loc] = purl;
  }
  return purlMappings;
}

export function getTestbeds(directory: string): string[] {
  const files = fs.readdirSync(directory).filter((f) => !f.startsWith("."));
  const lastParts = files.map((filename) =>
    filename.split("-").slice(1).join("-").replace(".json", "")
  );
  return [...new Set(lastParts)];
}

// ---------------------------------------------------------------------------
// Remove / filter helpers
// ---------------------------------------------------------------------------

function filterCves(cves: string[]): string[] {
  return cves.filter((cve) => cve.split("-")[0] !== "TEMP" && cve.split("-")[1] !== "2025");
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
  if (keys.some((k) => k?.includes("pkg:deb/") || k?.includes("pkg:dpkg/"))) {
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
  retval.packagelist = data.packagelist.filter(
    (k) => isOspkg(k) && !isKernelPackage(k)
  );

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
  retval.packagelist = data.packagelist.filter(
    (k) => isOspkgApk(k) && !isKernelPackageApk(k)
  );

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
  if (keys.some((k) => k?.includes("pkg:deb/") || k?.includes("pkg:dpkg/"))) {
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
    const newk = k.replace(/%2b/gi, "+").replace(/%40/gi, "@");
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
  const tool_keys = Object.keys(baseNokernel).filter(
    (k) => k.split("-")[0] === k.split("-")[1]
  );
  const pkgsPerTool = tool_keys.map(
    (k) => new Set(Object.keys(baseNokernel[k].purl_mapping))
  );

  const common = setIntersection(...pkgsPerTool);
  const allPkgs = pkgsPerTool.flatMap((s) => [...s]);
  const counts: Record<string, number> = {};
  for (const pkg of allPkgs) counts[pkg] = (counts[pkg] ?? 0) + 1;
  const nonCommon = Object.fromEntries(
    Object.entries(counts).filter(([pkg]) => !common.has(pkg))
  );
  return [common, nonCommon];
}

export function splitCommonAndNoncommonPackagesWithVulns(
  baseNokernel: Record<string, VulnReport>
): [Set<string>, Record<string, number>] {
  const tool_keys = Object.keys(baseNokernel).filter(
    (k) => k.split("-")[0] === k.split("-")[1]
  );
  const pkgsPerTool = tool_keys.map(
    (k) => new Set(Object.keys(baseNokernel[k].vulns_by_package))
  );
  const common = setIntersection(...pkgsPerTool);
  const allPkgs = pkgsPerTool.flatMap((s) => [...s]);
  const counts: Record<string, number> = {};
  for (const pkg of allPkgs) counts[pkg] = (counts[pkg] ?? 0) + 1;
  const nonCommon = Object.fromEntries(
    Object.entries(counts).filter(([pkg]) => !common.has(pkg))
  );
  return [common, nonCommon];
}

function setIntersection<T>(...sets: Set<T>[]): Set<T> {
  if (sets.length === 0) return new Set();
  let result = new Set(sets[0]);
  for (const s of sets.slice(1)) {
    result = new Set([...result].filter((x) => s.has(x)));
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

export function upstreamPkgs(
  data: Record<string, VulnReport>
): Record<string, string[]> {
  const anchore_mappings = data["anchore-anchore"].purl_mapping;
  const upstreams: Record<string, string[]> = {};
  for (const [id, purl] of Object.entries(anchore_mappings)) {
    const upstream = purl2Upstream(purl);
    if (!upstreams[upstream]) upstreams[upstream] = [];
    upstreams[upstream].push(id);
  }
  return upstreams;
}

export function getUpstream(
  db: Record<string, VulnReport>,
  initialTool: string
): string[] {
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
  if (!tools.some((t) => pkg in baseNokernel[t].purl_mapping)) {
    throw new Error(`${pkg} not found in any tool`);
  }

  let complete_purl: string;
  if (!(pkg in baseNokernel["anchore-anchore"].purl_mapping)) {
    if (pkg in baseNokernel["docker-docker"].purl_mapping) {
      complete_purl = baseNokernel["docker-docker"].purl_mapping[pkg];
    } else {
      for (const tool of tools) {
        if (pkg in baseNokernel[tool].purl_mapping) {
          complete_purl = baseNokernel[tool].purl_mapping[pkg];
        }
      }
    }
  } else {
    complete_purl = baseNokernel["anchore-anchore"].purl_mapping[pkg];
  }

  const tool = complete_purl!.split("@")[0].split("/").pop() ?? "";
  let version = complete_purl!.split("@")[1].split("?")[0].replace(/%2B/gi, "+");

  const [cup, cvers] = getUpstreamFromPurl(complete_purl!);
  const name = cup ? cup.split("/").pop()!.replace(/%2B/gi, "+") : tool;
  if (cvers !== null) version = cvers;
  return [name, version];
}

