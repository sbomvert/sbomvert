---
title: "Tutorial: your first comparison"
description: Walk through the SBOM Comparison and CVE Comparison pages for one container image and learn how to read the differences between tools.
---

# Tutorial: your first comparison

In this tutorial you compare what several tools reported for one container image: first the packages in their SBOMs, then the vulnerabilities their scanners found. It takes about 15 minutes.

**Before you start:** SBOMVert is running with the sample dataset loaded, as in the [Quickstart](/getting-started/quickstart) (Path A). Pick an image that has at least two SBOMs and at least two CVE reports; the image cards on `/compare` show both counts.

## Part 1: compare the SBOMs

### 1. Choose the image

1. Click **SBOM Comparison** in the sidebar (or open `/compare` and keep **SBOM Comparison** selected).
2. Type part of the image name in the search bar to narrow the list. The search runs half a second after you stop typing.
3. Click the image card.

You land on a page titled with the image name, under the label **SBOM Comparison**.

::: tip Reloading
The selected image is kept in memory only. If you reload the comparison page, SBOMVert sends you back to `/compare` to choose the image again.
:::

### 2. Choose the tools

The top of the page shows one card per SBOM, named after the tool and the format, for example `Syft (SPDX)` and `Syft (CDX)`. Each card shows the tool's **Vendor**, **Version** and **Format**, read from the SBOM itself.

All tools are selected at first. Click a card to leave it out of the comparison; its card is dimmed. At least two tools must stay selected. The counter above the cards shows how many are selected.

::: tip Compare formats too
The same tool in SPDX and in CycloneDX counts as two entries. Comparing them shows what a tool loses or changes when it writes the other format.
:::

### 3. Read the summary

The **Summary** view (the default; switch with **Summary** / **Table** at the top right) starts with three numbers:

| Number | Meaning |
| --- | --- |
| **Total packages** | Distinct packages found by at least one selected tool. |
| **Packages with conflicts** | Packages for which the tools reported different suppliers, licenses, pURLs, CPEs or hashes. |
| **Common packages** | Packages found by every selected tool. |

Below them are four charts:

- **Package Distribution**: per tool, the number of packages it found (**Total Packages**) and how many of them no other selected tool found (**Unique Packages**).
- **Tool Analysis**: a radar chart with, per tool, **Coverage %** (the share of all packages that this tool found and at least one other tool also found) and **Uniqueness %** (the share of this tool's packages that only it found).
- **Package similarity across tools**: a heatmap of the Jaccard similarity between each pair of tools, computed on `name@version`. 1 means identical lists.
- **pURL similarity across tools**: the same, computed on the exact pURL strings.

### 4. Look at individual packages

Switch to **Table**. The **Package Details** table lists every package with its **Type**, **Version** and the tools it was **Found In** (coloured badges for tools that found it, grey for tools that did not).

1. Use the filter buttons: **All**, **Common** (found by every selected tool) or **Unique Only** (found by exactly one tool).
2. Type in **Search packages...** to filter by name.
3. Click a column header to sort; click again to reverse.
4. A warning triangle next to a name means the package is missing from at least one tool or has conflicting metadata.
5. Click **Details** on a row to expand it.

The expanded row shows:

- **Tool Detection Status**: which tools found the package.
- **Supplier**, **License** and **Hash**: either one value marked "Consistent across all tools", or "Conflicts detected" with each tool's value, or "Not reported by any tool".
- **Package URL (pURL) Analysis**: the pURL broken into its parts. When tools disagree, you see "Multiple pURLs detected – Review required" and one breakdown per tool.
- **Common Platform Enumeration (CPE)**, when any tool reported one.
- A **Metadata Conflicts Detected** box when any of the above disagree.

## Part 2: compare the CVE reports

### 1. Choose the image

Click **CVE Comparison** in the sidebar and click the same image card.

The **Tools being compared** card lists one entry per CVE report, named after the scanner and the format of the SBOM it scanned, for example `grype (SPDX)` and `trivy (CDX)`. Click an entry to leave it out; at least two must stay selected.

If the image has only one CVE report, the page says so instead of showing a comparison.

### 2. Read the summary

The strip at the top shows **Unique CVEs** (distinct CVE IDs across the selected reports), **Tools compared** and **Vulnerable packages** (distinct packages with at least one CVE in any report).

Under **Per-tool breakdown**, each scanner has a card with:

- **Total**: the number of findings in the report. A scanner that lists the same CVE once per affected package counts it each time.
- **Unique CVEs**: distinct CVE IDs in the report.
- **Vuln Pkgs**: packages with at least one CVE.
- **Coverage vs unique total**: this report's unique CVEs as a share of all unique CVEs across the selected reports.

**Exclusive vulnerable packages** shows, per scanner, how many vulnerable packages no other selected scanner reported.

### 3. Look at individual packages

Switch to **Table**. Each row is a vulnerable package, identified by its pURL:

- **Status** is **shared** if more than one scanner flagged the package, or **only &lt;scanner&gt;** if just one did.
- One column per scanner gives its number of CVEs for the package.
- With exactly two scanners selected, a **Δ** column shows the difference between the first and the second.

Filter with **All** or **only &lt;scanner&gt;**, or search by package. Click a row to see each scanner's CVE IDs; each ID links to its NVD page.

## How to interpret the differences

- **A package found by only one tool** is not automatically a false positive or a miss. Tools look in different places (OS package databases, language lock files, binaries) and some report files or the image itself as packages. Open the package details and check its type and pURL.
- **Metadata conflicts** are common and often harmless: one tool writes `NOASSERTION`, another leaves the field empty, a third detects the license from files. pURL and CPE conflicts matter more, because scanners use them to look up vulnerabilities.
- **Low pURL similarity with high package overlap** usually means the tools agree on the packages but encode their pURLs differently (qualifiers such as `arch` or `distro`, namespaces, version prefixes). SBOMVert matches packages on normalized comparison keys, while the pURL heatmap compares the raw strings.
- **Different CVE counts for the same SBOM producer** point to the scanners' databases and matching rules. **Different counts for the same scanner on SPDX and CycloneDX** point to what each SBOM format carried.
- **A package flagged by only one scanner** is worth checking first: either the other scanner missed it, or this one matched it wrongly.

See [Why tools disagree](/concepts/tool-disagreement) and [Vulnerabilities and CVE reports](/concepts/vulnerabilities) for the background.

## Next steps

- Load your own reports: [Add your own SBOMs and CVE reports](/guides/add-reports).
- Look at one SBOM in depth: [Analyze an SBOM](/guides/analyze-sbom).
- Make an SBOM readable by another tool's scanner: [Translate an SBOM](/guides/translate-sbom).

## Related

- [Compare SBOMs](/guides/compare-sboms)
- [Compare CVE reports](/guides/compare-cves)
- [Package URLs (pURL)](/concepts/purl)
- [Why tools disagree](/concepts/tool-disagreement)
