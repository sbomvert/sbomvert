---
title: SBOM translation
description: What it means to translate an SBOM in SBOMVert, how tool dialects and the canonical package model work, and what translation cannot recover.
---

# SBOM translation

**Translating** an SBOM in SBOMVert means rewriting it the way another tool would have written it, optionally in the other format. For example, you can take a Docker Scout SPDX SBOM and produce the CycloneDX SBOM Syft would have written for the same packages.

The code is in `packages/core/src/translate/`. It runs in the browser on the [Translate page](/guides/translate-sbom), including in the [static build](/guides/static-build).

## Why translate

- **Feed a consumer the form it expects.** Scanners and other SBOM consumers are mostly tested against SBOMs from particular generators. Translating rewrites the purls in the spelling the target tool uses (qualifiers, epoch placement, distro naming), so a consumer can read another generator's output.
- **Change format.** Convert an SPDX SBOM to CycloneDX, or the other way, when a consumer only reads one format.
- **Compare like with like.** Rewriting several tools' SBOMs into one tool's form removes spelling differences, so the remaining differences are real ones.

## Terms

- **Dialect**: one tool's way of writing a package: how its purl is spelled and what its version includes. A dialect is the same in SPDX and CycloneDX. For example, Trivy writes a Debian epoch as an `epoch=` qualifier in both formats.
- **Format adapter**: knows where a format keeps what a dialect reads and writes. In SPDX the purl is in `externalRefs`; in CycloneDX it is the component's `purl` field.
- **Provider**: a dialect combined with a format adapter, which can read (and usually write) one tool's SBOMs in one format. SBOMVert calls the Syft providers `anchore`, the Scout providers `docker`, and so on.
- **Canonical package**: the tool-neutral form of one package that every provider reads into and writes from.

## The canonical package

A canonical package (`CanonicalPackage` in `packages/core/src/translate/types.ts`) holds what a purl and an SPDX package say about a package, spelled one way:

| Field | Example | Notes |
| --- | --- | --- |
| `type` | `deb` | Purl type. |
| `namespace` | `debian` | |
| `name` | `diffutils` | |
| `version` | `3.10-4` | Always without the epoch. |
| `epoch` | `1` | OS packages only. |
| `architecture` | `arm64` | When the tool gives it. |
| `distro` | `{ name: "debian", version: "13", fullVersion: "13.7", codename: "trixie" }` | OS packages only. Holds as much as the tool gave. |
| `upstream` | `{ name: "util-linux", version: "2.41-5" }` | The source package, OS packages only. |
| `qualifiers`, `subpath` | | For language packages: their purl's, unchanged. |
| `stage` | | The Dockerfile build stage, when the tool records it. |

A **canonical document** is the original SBOM plus, for each package, the original package as written and its canonical form (if it has a purl).

## How a translation runs

```text
                source SBOM (tool A, format X)
                              │
                              ▼
               provider A/X  toCanonical()
          reads each package's purl with A's dialect
                              │
                              ▼
     canonical document: original packages + canonical forms
                              │
               ┌──────────────┴──────────────┐
          X == Y                          X != Y
               │                             │
               │               spdxToCycloneDx() / cycloneDxToSpdx()
               │                  moves packages, files, hashes,
               │                  licenses, DEPENDS_ON, image, OS
               └──────────────┬──────────────┘
                              ▼
               provider B/Y  fromCanonical()
         writes each package's purl (and version) with B's dialect,
         adds packages B lists separately (Scout's source packages)
                              │
                              ▼
                target SBOM (tool B, format Y)
```

The entry point is `translateSbom(doc, from, to)` in `packages/core/src/translate/translateSbom.ts`:

1. **Read.** The source provider runs `toCanonical`, reading each package with the source tool's dialect.
2. **Convert format** (only if the formats differ). The canonical document is converted between SPDX and CycloneDX (`packages/core/src/translate/formats/convert.ts`). The canonical forms are carried along unchanged.
3. **Write.** The target provider runs `fromCanonical`. For each package it rewrites the purl, and the version when the target tool's version includes the epoch. Everything the canonical form does not cover, such as supplier, hashes and IDs, is kept from the original package.
4. **Extra packages.** If the target tool lists a deb's source package as a separate package (Docker Scout does), those packages are added, unless the SBOM already lists them.

## SPDX and CycloneDX conversion

The format conversion maps the parts the two formats share:

| SPDX 2.3 | CycloneDX 1.6 |
| --- | --- |
| Package with `primaryPackagePurpose: CONTAINER` | `metadata.component` |
| Package with `primaryPackagePurpose: OPERATING-SYSTEM` | Component with `type: operating-system` |
| Other packages | Components with `type: library` |
| `files[]` | Components with `type: file` |
| `checksums` (`SHA256`) | `hashes` (`SHA-256`) |
| `licenseDeclared` (or `licenseConcluded`) | `licenses: [{ expression }]` |
| `supplier: "Organization: X"` | `supplier: { name: "X" }` |
| `DEPENDS_ON` relationships | `dependencies` |
| `creationInfo.creators` (`Tool: name-version`) | `metadata.tools.components` |

SBOMs written from CycloneDX are SPDX 2.3. SBOMs written from SPDX are CycloneDX 1.6. A CycloneDX `bom-ref` that is a valid SPDX ID is kept as the `SPDXID`, so a round trip gets its IDs back.

## Supported tools

Which tool and format combinations have a provider (`PROVIDERS` and `CYCLONEDX_PROVIDERS` in `packages/core/src/translate/index.ts`):

| Tool | SPDX | CycloneDX |
| --- | --- | --- |
| Syft | Read and write | Read and write |
| Trivy | Read and write | Read and write |
| Docker Scout | Read and write | Read and write |
| Amazon Inspector | Read and write (the SPDX export) | Read and write (SBOM Generator's CycloneDX) |
| Google Artifact Analysis | Read and write | — |
| Microsoft sbom-tool | Read and write | — |

Any readable combination can be translated into any other. SBOMVert detects the source tool from SPDX `creationInfo.creators` or CycloneDX `metadata.tools`, and you can override it on the Translate page. OSV-Scanner and cdxgen have no translator of their own: their SBOMs can be analyzed and compared, but the Translate page cannot detect them as a source.

The same providers are also used, read-only, to compute the [comparison keys](/concepts/purl#comparison-keys) for Syft, Trivy and Scout SBOMs.

## What translation cannot do

Translation can only carry what the original tool wrote down. It never makes information up. In practice:

- **Missing details stay missing.** Translating a Scout SBOM, which has only the major Debian release, into Syft's form cannot produce Syft's full `debian-13.7`. Lowercased Go module paths cannot get their original case back.
- **Extra packages stay.** A Scout SBOM turned into Syft's form keeps Scout's separate source packages, so it has more packages than Syft would list.
- **Some fields have no place in the other format** and are dropped. On the SPDX side these are mainly non-`DEPENDS_ON` relationships, download location, copyright text and annotations. On the CycloneDX side they are the properties of language packages, nested components and evidence.
- **Different scans stay different.** If two tools scanned different architectures, translation cannot reconcile their packages.

The full list, per tool, is in [Translation limitations](https://github.com/sbomvert/sbomvert/blob/main/TRANSLATION_LIMITATIONS.md).

::: warning A translated SBOM is not a new scan
A translated SBOM claims to be in another tool's form, not to be that tool's output. Keep the original SBOM if you need to show where the data came from.
:::

## Related

- [Translate an SBOM](/guides/translate-sbom)
- [Package URLs (pURL)](/concepts/purl)
- [SBOMs, SPDX and CycloneDX](/concepts/sbom)
