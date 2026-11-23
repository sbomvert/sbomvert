---
title: Why tools disagree
description: The reasons SBOM generators produce different package lists for the same image, and how SBOMVert normalizes and counts those differences.
---

# Why tools disagree

Run Syft, Trivy and Docker Scout against the same container image and you get three different SBOMs. Some differences are real: one tool found a package another missed. Many are not: the tools found the same package but wrote it down differently. SBOMVert is built to separate the two. It is based on the research in [arXiv:2510.05798](https://arxiv.org/abs/2510.05798).

This page lists the sources of disagreement observed in SBOMVert's test data and in [TRANSLATION_LIMITATIONS.md](https://github.com/sbomvert/sbomvert/blob/main/TRANSLATION_LIMITATIONS.md), then explains what the comparison view counts.

## Terms

- **Identifier drift**: the same package described with a different name, version, namespace or purl by different tools.
- **Source package**: on Debian and Alpine, the package a binary package was built from. For example, Debian's `libblkid1` is built from `util-linux`.
- **Epoch**: a number in Debian and RPM versions, written before a colon (`1:3.10-4`), that overrides normal version ordering.
- **Comparison key**: the normalized identifier SBOMVert matches packages on. See [Package URLs](/concepts/purl#comparison-keys).

## Sources of disagreement

### Different spellings of the same package

These differences change the purl without changing the package:

| Difference | Example |
| --- | --- |
| **Epoch placement** | Syft and Scout write `diffutils@1%3A3.10-4`; Trivy writes `diffutils@3.10-4?epoch=1`. |
| **Distro release precision** | Syft writes the full release (`distro=debian-13.7`). Scout writes only the major release (`os_version=13`). Google writes only the major Debian release and Alpine's major.minor. Inspector's SPDX export gives no distro at all. |
| **Qualifier names** | Syft and Trivy use `arch` and `distro`; Scout uses `os_name`, `os_version` and `os_distro`. |
| **Case** | Trivy and Scout lowercase Go module paths (`github.com/azuread/...`); Syft keeps the original case (`github.com/AzureAD/...`). |
| **The `v` prefix** | Scout drops the `v` of Composer versions; Google drops it for Go and Composer. |
| **Namespace folding** | Google folds a package's namespace into its name for Go, npm, Composer and Maven. |
| **Maven group** | For the same jar, Trivy writes the group `org.ow2.asm`, while Syft and Scout guess `org.objectweb.asm` from its Java packages. |
| **Version suffixes** | Inspector's SPDX export appends `-null` to versions without a revision. |

### Different package lists

These differences change which packages are listed:

- **Source packages listed separately.** Docker Scout and Amazon Inspector's SPDX export list a Debian package's source package as a package of its own. Syft records it as an `upstream` qualifier on the binary package instead. A Scout SBOM therefore has more packages than a Syft SBOM of the same image.
- **Build stages.** On images with BuildKit attestations, Scout lists the packages of every build stage, not only those of the final image.
- **Installed vs source version.** Inspector's SPDX export gives a deb the version and epoch of its source package rather than its own, so the installed version is lost.
- **Missing purls.** Microsoft's sbom-tool writes no purl at all for Alpine packages and RPMs, and lists no language packages.
- **Unreliable runs.** sbom-tool sometimes reports success with no packages on large images.

### Different images

When no platform is given, the tools do not always scan the same one. In SBOMVert's own scans, Syft and Scout often took the `arm64` variant of a multi-arch image while Trivy took `amd64`. Packages whose presence or version depends on the architecture then really do differ. No normalization can fix this.

### Different metadata

Even for a package every tool found, the supplier, license, hash and CPE often differ. Some tools leave a field out; others fill it from a different source.

## How SBOMVert matches packages

The comparison logic is in `compareMultipleTools` (`src/lib/diffReports.ts`). It takes one parsed SBOM per tool.

```text
SBOM (tool A) ─┐
SBOM (tool B) ─┼─> parse ─> key per package ─> group by key ─> join purl-less packages ─> statistics
SBOM (tool C) ─┘
```

1. **Parse.** Each SBOM is parsed into a package list (see [SBOMs, SPDX and CycloneDX](/concepts/sbom#packages-and-components)). Each package gets a comparison key from its purl, using the tool's translator for Syft, Trivy and Scout.
2. **Group by key.** Packages with the same key are treated as the same package. A package without a key (no purl, or the image itself) is grouped by `name@version` instead. If one tool lists two packages with the same key, for example two copies of a library, that tool is counted once for it.
3. **Join packages without a purl.** A package that no tool gave a purl is merged into a keyed package with the same name and version, ignoring the epoch, a leading `v`, and case. The merge happens only when exactly one keyed package matches and none of that package's tools already listed it. This is how Microsoft's purl-less Alpine and RPM packages line up with the other tools.

Keys ignore architecture, distro and source package qualifiers. So the `diffutils` example above counts as **one package found by three tools**, not three unique packages.

## What is counted

For the selected tools, the comparison reports:

| Statistic | Meaning |
| --- | --- |
| **Packages per tool** | The number of packages in that tool's parsed list. |
| **Common to all** | Packages found by every selected tool. |
| **Unique to a tool** | Packages found by exactly one tool. |
| **Packages with conflicts** | Matched packages whose metadata differs between tools (see below). |

A package found by some tools but not all, and by more than one, is neither common nor unique. It still appears in the package table with the list of tools that found it.

::: details Edge case: one SBOM
With a single SBOM selected, every package counts as "common to all", and none as unique.
:::

### Metadata conflicts

For each matched package, SBOMVert collects the distinct non-empty values each tool reported for five fields: **supplier**, **license**, **purl**, **CPE** and **hash** (the first checksum). If any field has more than one distinct value, the package is marked as having a metadata conflict.

Purl conflicts are common by design: the three `diffutils` purls above are one package with a purl conflict. The conflict view shows what each tool wrote, so you can see the drift without it inflating the "unique" counts.

## What normalization does not hide

The comparison key removes spelling differences. It does not remove:

- packages only one tool lists, such as Scout's separate source packages and build-stage packages;
- version differences caused by scanning a different architecture;
- versions that are actually wrong, such as Inspector's SPDX source versions;
- packages with no purl that match nothing by name and version.

These show up as unique packages, which is accurate: those tools reported different inventories.

## Related

- [Package URLs (pURL)](/concepts/purl)
- [Compare SBOMs](/guides/compare-sboms)
- [SBOM translation](/concepts/translation)
