---
title: Compare CVE reports
description: Use SBOMVert's CVE Comparison view to see which vulnerabilities different scanners reported for the same image, package by package.
---

# Compare CVE reports

The **CVE Comparison** view puts the CVE reports of several vulnerability scanners side by side for one container image. It shows how many vulnerabilities each scanner found, which packages only one scanner flagged, and the CVE IDs behind each difference.

## Before you start

- SBOMVert runs with a server (the view is not in the [static build](/guides/static-build)).
- At least two CVE reports are stored for the image, under `cve/<image>/`, named `<scanner>.<format>.json`. The image must also have SBOMs, because the image list comes from the SBOM folder. See [Add your own SBOMs and CVE reports](/guides/add-reports).

::: warning CVE reports are stored in SBOMVert's own format
The files in `cve/` are not the raw JSON that Grype or Trivy print. They are reports already normalized by SBOMVert's scan worker. See [CVE report files](/guides/add-reports#cve-report-files).
:::

## Open the view

There are two entry points; both lead to the same page:

- Click **CVE Comparison** in the sidebar (`/compare/cve`). This entry is always present.
- Open `/compare` and click the **CVE Comparison** button under **Select Comparison Type**. This button only appears when `NEXT_PUBLIC_CVE_MAPPING_ENABLED=true`.

Then search for the image and click its card. Each card shows how many CVE reports are available.

**Expected result:** `/compare/cve/report`, titled with the image name under the label **CVE Comparison**. As with SBOMs, the selected image is held in memory, and reloading this page sends you back to `/compare`.

### What `NEXT_PUBLIC_CVE_MAPPING_ENABLED` does

In the current code the flag controls one thing: whether the **CVE Comparison** button is shown on the `/compare` page. It does not enable or disable the `/compare/cve` pages, the CVE API routes, or how reports are read. Because the button is in browser code, the value is taken when the app is built.

## Select the scanners

**Tools being compared** lists one entry per CVE report file. The label is the scanner and the format of the SBOM it scanned, taken from the file name: `grype.spdx.json` becomes `grype (SPDX)`, `trivy.cdx.json` becomes `trivy (CDX)`.

Click an entry to include or exclude it. At least two must stay selected. If the image has no report, the page says "No CVE reports found for this subject."; with only one, it names that scanner and asks for a second report.

::: tip Which SBOM was scanned
A CVE report records which scanner ran and the SBOM format, not which tool generated the SBOM. In SBOMVert's live scans, Grype scans Syft's SBOM and Trivy scans Trivy's own SBOM. Keep this in mind when two reports differ: the cause can be the scanner or the SBOM it read.
:::

## Summary view

The strip at the top:

| Number | Meaning |
| --- | --- |
| **Unique CVEs** | Distinct vulnerability IDs across the selected reports, counted as each scanner reports them. A GitHub advisory and the CVE it names count as two IDs. |
| **Tools compared** | Number of selected reports. |
| **Vulnerable packages** | Distinct packages with at least one CVE in any selected report. |

**Per-tool breakdown** has a card per report:

| Field | Meaning |
| --- | --- |
| **Total** | The report's `totalCVEs`. For Trivy and Docker Scout this counts a CVE once per affected package; for Grype each CVE ID once. |
| **Unique CVEs** | Distinct CVE IDs in the report. |
| **Vuln Pkgs** | Packages with at least one CVE. |
| **Coverage vs unique total** | The report's unique CVEs as a percentage of **Unique CVEs** across all selected reports. |

**Exclusive vulnerable packages** gives, per report, the number of vulnerable packages that no other selected report lists.

## Table view

Each row is a vulnerable package, identified by a normalized pURL:

- **Package**: the pURL.
- **Status**: **shared** when more than one report flags the package, **only &lt;scanner&gt;** when one does.
- One column per report with its CVE count for the package, or **—**.
- **Δ**, only when exactly two reports are selected: the first report's count minus the second's.

Rows are sorted with packages flagged by the most reports first, then by name. Use **Search packages…** to filter by pURL, and the **All** / **only &lt;scanner&gt;** pills to show only the packages a single report flagged. The counter shows matching packages out of the total.

Click a row to expand it: one column per report lists its vulnerability IDs for the package, or "Not detected". Each ID is a button that opens its details (below).

### Details of one CVE

Click an ID to open its details in a side panel. The panel has one table for all the reports that list that ID:

- **By tool**: the severity, score, fix and source each report gives. The fix reads `fixed in <version>`, `no fix`, `will not fix`, `fix deferred` or `fix unknown`. A field the report does not have reads "not reported", and a scanner may give no score for a vulnerability another scanner scores.
- **Description**, with the report it came from.
- **Other IDs**: the aliases the scanners give, such as the CVE behind a GitHub advisory. A CVE ID links to NVD.
- **CVSS**: every score a report gives, with its source, version and vector.
- **Advisory**: each report's primary link.

Close the panel with the **×** button, a click outside it, or Escape.

::: tip Reports stored before the panel
Reports stored before SBOMVert kept severity and fix details have no `cveDetails`, so the panel shows "not reported" for them. Scanning the image again, or rebuilding its report from the raw output, fills them in.
:::

## How packages are matched

Scanners write the same package's pURL differently, so the reports are keyed by a comparable pURL when they are created:

- Lower case and URL-decoded.
- Debian packages (`pkg:deb`, `pkg:dpkg`): the version without its epoch, no qualifiers; `pkg:dpkg` pURLs and `pkg:deb` pURLs without a namespace get the `debian` namespace (`pkg:deb/debian/<name>@<version>`).
- Alpine packages (`pkg:apk`): the version without its epoch, no qualifiers; a pURL without a namespace gets `alpine` (`pkg:apk/alpine/<name>@<version>`).
- Other package types: the pURL without its version.

The original pURLs are kept in each report's `purl_mapping`.

## Interpreting the results

- **Packages flagged by only one scanner** are the most useful rows: open them and compare the CVE IDs.
- **A large gap in Total with a small gap in Unique CVEs** usually comes from how each scanner counts, not from different findings.
- **Findings can describe another operating system.** Language-package advisories are matched by name and version, so a Windows-only advisory can appear for a Linux image. Read its description in the details panel first.
- **The same scanner on SPDX and CycloneDX** can disagree on one SBOM, because each format carries different metadata. Compare both reports before concluding that one scanner found more. See [Same SBOM, two formats](/concepts/tool-disagreement#same-sbom-two-formats).

See [Vulnerabilities and CVE reports](/concepts/vulnerabilities) for the background.

## Related

- [Tutorial: your first comparison](/getting-started/first-comparison)
- [Vulnerabilities and CVE reports](/concepts/vulnerabilities)
- [Add your own SBOMs and CVE reports](/guides/add-reports)
- [Live scans](/guides/live-scans)
