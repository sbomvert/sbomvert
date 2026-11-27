---
title: Vulnerabilities and CVE reports
description: How SBOMVert gets CVE reports by scanning SBOMs, normalizes Trivy, Grype and Docker Scout output into one shape, and compares findings package by package.
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
| Docker Scout | Docker Scout | `docker scout cves sbom://<file> --format sarif` |

Each scanner runs once per SBOM format requested (SPDX, CycloneDX). The resulting report is stored as `cve/<image>/<tool>.<format>.json`, where `<format>` is the format of the SBOM that was scanned (see Data layout).

Because the scanner only sees the SBOM, **SBOM quality limits CVE results**. A package the generator missed, or wrote with a purl the scanner does not understand, cannot be matched. Comparing the SPDX and CycloneDX reports of the same scanner is one way to see this effect.

::: tip Docker Scout
Docker Scout looks up vulnerabilities through a Docker Hub account. Set `DOCKER_SCOUT_HUB_USER` and `DOCKER_SCOUT_HUB_PASSWORD` in the worker's environment (see [Live scans](/guides/live-scans)). Without them its scans fail, and the other scanners still finish.
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
| `cveDetails` | Per vulnerability ID: severity, score, fix, source, CVSS, primary link, description and other IDs. Reports stored before this field existed have none. See [Severity, fix and details](#severity-fix-and-details). |
| `packagelist` | Not filled by the current extractors. |

The live-scan worker runs the extractor right after the scan and stores the normalized `VulnReport`. It also keeps each scanner's raw output under `CVE_RAW_DIR` (default `public/cve-raw`), or under `CVE_RAW_PREFIX` (default `cve-raw/`) in S3, so the original findings can be checked later. The CVE comparison view reads only the normalized files.

### Severity, fix and details

Each stored vulnerability ID can carry a `cveDetails` entry, in one shape for every scanner:

| Field | Content |
| --- | --- |
| `id`, `aliases` | The ID the scanner reports, and the other IDs of the same vulnerability (see [Why scanners disagree](#why-scanners-disagree)). |
| `severity` | `critical`, `high`, `medium`, `low`, `negligible`, or `unknown` when the scanner gives none. |
| `score` | The primary CVSS base score: version 3 first, otherwise the first score given. |
| `status` | `fixed`, `not_fixed`, `wont_fix`, `deferred`, or `unknown`. |
| `fixedVersion` | The version that fixes it, when `status` is `fixed`. |
| `source` | Who published it: Trivy's data source (for example `debian`), or Grype's namespace. Docker Scout does not name one, so the field is left out. |
| `cvss` | Every CVSS score the scanner gives, with its source, version and vector. |
| `url` | The primary advisory link. |
| `description` | The scanner's description, when it gives one. |

A report also records each package's own fix, in `packageFixes` (by package, then CVE id): the status and every fixed version the scanner lists for that package. Scanners can give a different fix per package, for example one fix per maintained branch. The package rows show the package's own fix. The CVE-level `status` and `fixedVersion` are what all its packages agree on: the status is `unknown` when the packages disagree, and the version is shown only when they name the same single version. A package lists one version as `fixed in <version>`, and several versions as "fixed".

The comparison counts do not use these fields. They are shown in the details panel of the [CVE comparison](/guides/compare-cves#details-of-one-cve).

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

- **Database age.** A report reflects the database at scan time. The live-scan worker downloads the Grype and Trivy databases at startup and refreshes them every `DB_REFRESH_HOURS` (24 by default). Reports scanned on different days can differ for that reason alone.
- **Different identifiers.** Scanners can report a GitHub advisory (`GHSA-...`) or Go (`GO-...`) ID instead of a CVE ID, and name the CVE as an alias. SBOMVert stores the aliases in `cveDetails`, but the counts still use the ID the scanner reports, so `CVE-X` and `GHSA-Y` describing the same issue count as two IDs.
- **Fix availability and severity.** Scanners also disagree on these. SBOMVert stores them per vulnerability (see [Severity, fix and details](#severity-fix-and-details)), but the comparison counts do not use them.

## Related

- [Compare CVE reports](/guides/compare-cves)
- [Run live scans](/guides/live-scans)
- [Why tools disagree](/concepts/tool-disagreement)
