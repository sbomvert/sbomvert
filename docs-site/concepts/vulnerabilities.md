---
title: Vulnerabilities and CVE reports
description: How SBOMVert gets CVE reports by scanning SBOMs, normalizes Trivy and Grype output into one shape, and compares findings package by package.
---

# Vulnerabilities and CVE reports

A **CVE** (Common Vulnerabilities and Exposures) entry is a public identifier for a known vulnerability, such as `CVE-2024-45490`. A **CVE report** is a scanner's output for one target: which packages it found, and which vulnerability identifiers it matched to each package.

SBOMVert compares CVE reports from different scanners for the same image, the same way it compares SBOMs. This page explains where those reports come from, the common shape SBOMVert stores them in, and what the comparison does and does not show.

## Image scanning and SBOM scanning

A vulnerability scanner can work in two ways:

- **Image scanning.** The scanner pulls the image, catalogs its packages itself, then matches them against its vulnerability database.
- **SBOM scanning.** The scanner reads an existing SBOM and matches the packages listed in it. It never looks at the image.

SBOMVert uses **SBOM scanning**. Its [live scans](/guides/live-scans) first generate SBOMs, then pass them to a scanner (`packages/scan/src/vuln/scanner.ts`):

| Scanner | Reads the SBOM of | Command |
| --- | --- | --- |
| Trivy | Trivy | `trivy sbom <file> --skip-db-update --format json` |
| Grype | Syft | `grype sbom:<file> -o=json` |

Each scanner runs once per SBOM format requested (SPDX, CycloneDX). The resulting report is stored as `cve/<image>/<tool>.<format>.json`, where `<format>` is the format of the SBOM that was scanned (see Data layout).

Because the scanner only sees the SBOM, **SBOM quality limits CVE results**. A package the generator missed, or wrote with a purl the scanner does not understand, cannot be matched. Comparing the SPDX and CycloneDX reports of the same scanner is one way to see this effect.

::: tip Docker Scout
SBOMVert has a command for `docker scout cves`, but no parser for its output yet. Scout is therefore not offered as a scanner (`SupportedTools.consumers` in `packages/scan/src/tools.ts`). It is still available as an SBOM generator.
:::

## The normalized report

Every scanner writes a different JSON structure. `VULN_EXTRACTORS` (`packages/core/src/vuln/vulnutils.ts`) maps each supported scanner to a function that converts its output into one shape, `VulnReport`:

| Field | Content |
| --- | --- |
| `cves` | Vulnerability IDs found (see the per-scanner notes below on duplicates). |
| `totalCVEs` | Length of `cves`. |
| `library` | Findings on OS packages. |
| `language` | Findings on language packages. |
| `vulns_by_package` | Normalized package identifier → list of vulnerability IDs. |
| `vulnpackagelist` | A copy of `vulns_by_package`. |
| `purl_mapping` | Normalized package identifier → the purl as the scanner wrote it. |
| `packagelist` | Not filled by the current extractors. |

The live-scan worker runs the extractor right after the scan, and only the normalized `VulnReport` is stored. The raw scanner output is not kept. The CVE comparison view reads these normalized files.

### Per-scanner behavior

The two extractors do not count findings the same way:

- **Trivy** (`extractTrivyVulnerabilities`) walks `Results[].Vulnerabilities[]` and takes `VulnerabilityID` and `PkgIdentifier.PURL`. It records **every finding**. A CVE that affects three packages appears three times in `cves`. A finding counts as OS (`library`) or language based on the purl's ecosystem.
- **Grype** (`extractAnchoreVulnerabilities`) walks `matches[]` and takes `vulnerability.id` and `artifact.purl`. It de-duplicates IDs per package and across the report, so each ID appears once in `cves`. It classifies a finding as OS or language from Grype's `vulnerability.namespace` (containing `distro` or `language`).

Per-tool totals are therefore not directly comparable between Trivy and Grype: Trivy counts findings, Grype counts distinct IDs. The count of **unique IDs across selected tools** is computed from the union and is comparable.

### Severity and fix information

The normalized report stores **only identifiers and packages**. It does not store severity, CVSS scores, fix versions or fix state, so the CVE comparison does not compare them. Use the scanner's own output if you need those fields.

## Matching packages across scanners

To show which scanners flagged which package, both reports must name the package the same way. The CVE comparison does not use the SBOM [comparison keys](/concepts/purl#comparison-keys). It uses its own normalization, `toComparablePurl`:

1. The purl is percent-decoded and lowercased.
2. **Debian** (`pkg:deb/...` and the older `pkg:dpkg/...`): rewritten as `pkg:deb/debian/<name>@<version>`, with the epoch and all qualifiers removed.
3. **Alpine** (`pkg:apk/...`): rewritten as `pkg:apk/alpine/<name>@<version>` (the `alpine` namespace is added if missing), with the epoch and qualifiers removed.
4. **Everything else** (npm, PyPI, Go, Maven, RPM, ...): only the part before `@`, **without the version**.

```text
pkg:deb/debian/libexpat1@2.5.0-1%2Bdeb12u1?arch=amd64&distro=debian-12   ->  pkg:deb/debian/libexpat1@2.5.0-1+deb12u1
pkg:npm/lodash@4.17.20                                                    ->  pkg:npm/lodash
```

::: warning Language packages are matched by name only
Two scanners that flag different versions of the same npm, PyPI or Go package are shown as flagging the same package. If an image contains two versions of a library, their findings are merged under one row.
:::

## What the CVE comparison shows

For the selected scanner reports of one image (`src/lib/vuln/cveSummary.ts`), the comparison shows:

- **CVEs per tool**: the length of each report's `cves` list.
- **Unique CVEs**: the distinct IDs across all selected reports.
- **Vulnerable packages**: the distinct normalized packages with at least one finding in any selected report.
- **A package table**: one row per vulnerable package, with each tool's IDs for it and the set of tools that flagged it. Rows found by more tools come first. You can filter to packages that only one tool flagged.

## Enabling the CVE comparison

`NEXT_PUBLIC_CVE_MAPPING_ENABLED=true` shows the **CVE Comparison** button on the `/compare` page (`src/components/hoc/ComparisonTypeSelector`). That is all the flag does. It does not gate `/api/cve` or the `/compare/cve` pages, and it does not change how reports are parsed. See [Environment variables](https://github.com/sbomvert/sbomvert#environment-variables).

## Why scanners disagree

Even on the same SBOM, scanners report different vulnerabilities. Some of the reasons are visible in SBOMVert:

- **Different input.** Grype reads Syft's SBOM and Trivy reads Trivy's, so they start from different package lists (see [Why tools disagree](/concepts/tool-disagreement)).
- **Different databases.** Each scanner has its own vulnerability database and its own rules for which advisories apply to which distro release.
- **Database age.** A report reflects the database at scan time. The live-scan worker downloads the Grype and Trivy databases at startup and refreshes them every `DB_REFRESH_HOURS` (24 by default). Reports scanned on different days can differ for that reason alone.
- **Different identifiers.** Scanners can report a GitHub advisory ID (`GHSA-...`) instead of, or in addition to, a CVE ID. SBOMVert does not map aliases, so `CVE-X` and a `GHSA-Y` describing the same issue count as two IDs.
- **Fix availability and severity.** Scanners also disagree on these, but SBOMVert does not store them (see above).

## Related

- [Compare CVE reports](/guides/compare-cves)
- [Run live scans](/guides/live-scans)
- [Why tools disagree](/concepts/tool-disagreement)
