---
title: Compare SBOMs
description: Use SBOMVert's SBOM Comparison view to see which packages different tools found for the same image, how their metadata differs, and how similar their SBOMs are.
---

# Compare SBOMs

The **SBOM Comparison** view puts the SBOMs that several tools produced for one container image side by side. It answers three questions: which packages each tool found, which packages only some tools found, and where the tools disagree on a package's metadata.

This page is a reference for the view. For a guided first run, see the [tutorial](/getting-started/first-comparison).

## Before you start

- SBOMVert runs with a server (the view is not in the [static build](/guides/static-build)).
- At least two SBOMs are stored for the image, under `sbom/<image>/`. See [Add your own SBOMs and CVE reports](/guides/add-reports).

## Open the view

1. Click **SBOM Comparison** in the sidebar (`/compare/sbom`), or open `/compare` with **SBOM Comparison** selected. Both list the same images.
2. Find the image: the search bar filters by image name, and **Previous** / **Next** page through the list, 20 images per page.
3. Click the image card. Cards show the number of SBOMs and CVE reports; a card with fewer than two SBOMs is greyed out and cannot be selected.

**Expected result:** `/compare/sbom/artifact`, titled with the image name under the label **SBOM Comparison**.

The selected image is held in memory. Opening or reloading `/compare/sbom/artifact` directly sends you back to `/compare`.

## Select the tools

SBOMVert loads every SBOM stored for the image and shows one card per file. Each entry is named after the tool, as the SBOM names it, and the format: `Syft (SPDX)`, `Trivy (CDX)`. A tool stored in both formats appears twice.

Click a card to include or exclude it. The comparison needs at least two tools; trying to deselect below two shows an alert.

## Summary view

The **Summary** view shows:

| Element | What it shows |
| --- | --- |
| **Total packages** | Distinct packages across the selected tools. |
| **Packages with conflicts** | Packages whose supplier, license, pURL, CPE or hash differs between the tools that found them. |
| **Common packages** | Packages found by every selected tool. |
| **Package Distribution** | Per tool: **Total Packages** and **Unique Packages** (found by no other selected tool). |
| **Tool Analysis** | Per tool: **Coverage %** (its packages that other tools also found, as a share of all packages) and **Uniqueness %** (its packages that only it found, as a share of its own packages). |
| **Package similarity across tools** | Jaccard similarity between each pair of tools on `name@version`. |
| **pURL similarity across tools** | Jaccard similarity on the exact pURL strings. |

## Table view

The **Table** view lists every package in **Package Details**:

- **Filters:** **All**, **Common** (found by every selected tool) and **Unique Only** (found by exactly one).
- **Search packages...** filters by package name.
- **Sorting:** click **Package**, **Type**, **Version** or **Found In** to sort; click again to reverse.
- **Found In** shows every selected tool as a badge, coloured if the tool found the package, grey if not.
- A **warning triangle** marks a package that some tools missed or whose metadata conflicts.
- **Details** expands the row: tool detection status, **Supplier**, **License**, **Hash**, **Package URL (pURL) Analysis** and **Common Platform Enumeration (CPE)**, each either consistent across tools or listed per tool with "Conflicts detected".

## How packages are matched

Two tools rarely write the same package identically, so SBOMVert does not match on the raw name or pURL. For SBOMs from Syft, Trivy and Docker Scout it matches on a **comparison key** built from the package's type, namespace, name and version as that tool's translator reads them:

- in lower case;
- without the epoch, and without a leading `v` on a language package's version;
- without architecture, distro or source-package qualifiers, on which tools differ for the same package;
- for Maven packages, without the group ID, because tools disagree on it for the same JAR.

For SBOMs from other tools, the key is built the same way from the package's pURL. A package without a pURL is matched by `name@version`; if exactly one keyed package has that name and version, it joins that package.

The two similarity heatmaps do not use these keys: they compare raw `name@version` and raw pURL strings. A low pURL similarity next to a high package overlap therefore means the tools found the same packages but wrote their pURLs differently. See [Package URLs](/concepts/purl) and [SBOM translation](/concepts/translation).

## Interpreting the results

- **Unique packages** are where to look first. Check their type and pURL in **Details**: they are often files, binaries or language packages that only one tool's cataloguers look for.
- **Conflicts on pURL or CPE** affect vulnerability scanning: a scanner that reads this SBOM looks up vulnerabilities with those identifiers.
- **Conflicts on license or supplier** affect compliance reports, and often come from one tool writing `NOASSERTION` while another leaves the field out.
- **The same tool in SPDX and CycloneDX** should match closely; differences show what each format carries for that tool.

## Related

- [Tutorial: your first comparison](/getting-started/first-comparison)
- [Why tools disagree](/concepts/tool-disagreement)
- [Package URLs (pURL)](/concepts/purl)
- [Compare CVE reports](/guides/compare-cves)
