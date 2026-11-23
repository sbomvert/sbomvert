---
title: SBOMs, SPDX and CycloneDX
description: What a Software Bill of Materials is, how SPDX and CycloneDX describe the same image, and which parts of an SBOM SBOMVert reads.
---

# SBOMs, SPDX and CycloneDX

A **Software Bill of Materials (SBOM)** is a machine-readable list of the components that make up a piece of software. For a container image, that means the operating system packages (Debian `.deb`, Alpine `.apk`, RPM), the language packages (npm, PyPI, Go modules, Maven jars, ...) and sometimes individual files.

This page explains what is inside an SBOM, compares the two formats SBOMVert reads, and states which fields SBOMVert actually uses.

## Why SBOMs matter

An SBOM is an inventory, not a verdict. It becomes useful when another process consumes it:

- **Vulnerability scanning.** A scanner such as Trivy or Grype can read an SBOM instead of the image and match each package against a vulnerability database. See [Vulnerabilities and CVE reports](/concepts/vulnerabilities).
- **License review.** Each package can carry a declared license.
- **Change tracking.** Two SBOMs of the same image, taken at different times or by different tools, can be diffed.

All three depend on the SBOM being complete and on packages being identified consistently. Different generators produce different SBOMs for the same image, which is the problem SBOMVert was built to show. See [Why tools disagree](/concepts/tool-disagreement).

## Generation and consumption

Two roles appear throughout these docs:

- A **generator** (or producer) inspects an image and writes an SBOM. Syft, Trivy, Docker Scout, Amazon Inspector SBOM Generator, OSV-Scanner and cdxgen are generators.
- A **consumer** reads an SBOM and does something with it. In SBOMVert the consumers are vulnerability scanners: Trivy reads Trivy's SBOM and Grype reads Syft's SBOM (see `packages/scan/src/tools.ts`).

SBOMVert itself is a consumer of SBOMs: it parses them for the analysis and comparison views, and it can rewrite them for another tool (see [SBOM translation](/concepts/translation)). It only generates SBOMs indirectly, when the optional [live scans](/guides/live-scans) run the generator tools.

## SPDX and CycloneDX

Two open formats dominate:

- **SPDX** (Software Package Data Exchange), a Linux Foundation project and ISO/IEC 5962 standard. An SPDX 2.x document has a flat list of `packages`, optional `files`, and `relationships` that connect them by `SPDXID`.
- **CycloneDX**, an OWASP project. A CycloneDX BOM has a `metadata` block (including the subject, `metadata.component`), a list of `components` that can nest, and a separate `dependencies` graph keyed by `bom-ref`.

| Concept | SPDX 2.x | CycloneDX |
| --- | --- | --- |
| Format marker | `spdxVersion: "SPDX-2.3"` | `bomFormat: "CycloneDX"`, `specVersion` |
| Who made it | `creationInfo.creators` (`"Tool: syft-1.54.1"`) | `metadata.tools` |
| The image itself | A package, often with `primaryPackagePurpose: "CONTAINER"` | `metadata.component` with `type: "container"` |
| A package | Entry in `packages[]`, identified by `SPDXID` | Entry in `components[]`, identified by `bom-ref` |
| Package URL | `externalRefs[]` with `referenceType: "purl"` | `purl` field |
| License | `licenseDeclared`, `licenseConcluded` (SPDX expressions) | `licenses[]` (`license.id`, `license.name` or `expression`) |
| Hashes | `checksums[]` (`SHA256`) | `hashes[]` (`SHA-256`) |
| Dependencies | `relationships[]` (`DEPENDS_ON`, `CONTAINS`, `DESCRIBES`, ...) | `dependencies[]` (`ref`, `dependsOn`) |

## Versions SBOMVert can read

SBOMVert reads **JSON** SBOMs only. It decides the format from two top-level fields (`formatOf` in `packages/core/src/translate/detectTool.ts`):

- a string `spdxVersion` means SPDX;
- `bomFormat: "CycloneDX"` means CycloneDX.

| Format | Read | Written by translation |
| --- | --- | --- |
| SPDX 2.x JSON (2.2, 2.3) | Yes | SPDX 2.3 |
| SPDX 3.0 (JSON-LD) | No: it has no top-level `spdxVersion` | No |
| SPDX tag-value, YAML, RDF/XML | No | No |
| CycloneDX JSON 1.4, 1.5, 1.6 | Yes: `metadata.tools` is read both as the 1.4 array and as the 1.5+ `{ components, services }` object | CycloneDX 1.6 |
| CycloneDX XML | No | No |

::: warning cdxgen and SPDX 3.0
cdxgen writes SPDX 3.0, which SBOMVert cannot read. That is why live scans only ask cdxgen for CycloneDX (`CdxgenConfig` in `packages/scan/src/tools.ts`). For the same reason, OSV-Scanner is only asked for SPDX: its CycloneDX output has no OS packages.
:::

## Example: one image, two formats

The two documents below describe the same thing: an Alpine 3.21 image containing `busybox` and `musl`, where `busybox` depends on `musl`. They are trimmed to the fields that matter here. Both are valid for their schema. The purls use Syft's spelling (`arch` and `distro` qualifiers); see [Package URLs](/concepts/purl).

::: code-group

```json [SPDX 2.3]
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "alpine:3.21",
  "documentNamespace": "https://example.com/spdxdocs/alpine-3.21-5b1f2c4e",
  "creationInfo": {
    "created": "2026-11-10T16:38:31Z",
    "creators": ["Tool: syft-1.54.1"]
  },
  "packages": [
    {
      "name": "alpine:3.21",
      "SPDXID": "SPDXRef-Image",
      "downloadLocation": "NOASSERTION",
      "filesAnalyzed": false,
      "primaryPackagePurpose": "CONTAINER"
    },
    {
      "name": "busybox",
      "SPDXID": "SPDXRef-Package-busybox",
      "versionInfo": "1.37.0-r12",
      "supplier": "Organization: Alpine Linux",
      "downloadLocation": "NOASSERTION",
      "filesAnalyzed": false,
      "licenseConcluded": "NOASSERTION",
      "licenseDeclared": "GPL-2.0-only",
      "copyrightText": "NOASSERTION",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:apk/alpine/busybox@1.37.0-r12?arch=x86_64&distro=alpine-3.21.3"
        }
      ]
    },
    {
      "name": "musl",
      "SPDXID": "SPDXRef-Package-musl",
      "versionInfo": "1.2.5-r9",
      "supplier": "Organization: Alpine Linux",
      "downloadLocation": "NOASSERTION",
      "filesAnalyzed": false,
      "licenseConcluded": "NOASSERTION",
      "licenseDeclared": "MIT",
      "copyrightText": "NOASSERTION",
      "externalRefs": [
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:apk/alpine/musl@1.2.5-r9?arch=x86_64&distro=alpine-3.21.3"
        }
      ]
    }
  ],
  "relationships": [
    { "spdxElementId": "SPDXRef-DOCUMENT", "relationshipType": "DESCRIBES", "relatedSpdxElement": "SPDXRef-Image" },
    { "spdxElementId": "SPDXRef-Image", "relationshipType": "CONTAINS", "relatedSpdxElement": "SPDXRef-Package-busybox" },
    { "spdxElementId": "SPDXRef-Image", "relationshipType": "CONTAINS", "relatedSpdxElement": "SPDXRef-Package-musl" },
    { "spdxElementId": "SPDXRef-Package-busybox", "relationshipType": "DEPENDS_ON", "relatedSpdxElement": "SPDXRef-Package-musl" }
  ]
}
```

```json [CycloneDX 1.6]
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "serialNumber": "urn:uuid:5b1f2c4e-8d0a-4f3e-9c61-2a7b8e4d9f10",
  "version": 1,
  "metadata": {
    "timestamp": "2026-11-10T16:38:31Z",
    "tools": {
      "components": [{ "type": "application", "name": "syft", "version": "1.54.1" }]
    },
    "component": {
      "bom-ref": "image",
      "type": "container",
      "name": "alpine:3.21"
    }
  },
  "components": [
    {
      "bom-ref": "pkg:apk/alpine/busybox@1.37.0-r12?arch=x86_64&distro=alpine-3.21.3",
      "type": "library",
      "supplier": { "name": "Alpine Linux" },
      "name": "busybox",
      "version": "1.37.0-r12",
      "licenses": [{ "license": { "id": "GPL-2.0-only" } }],
      "purl": "pkg:apk/alpine/busybox@1.37.0-r12?arch=x86_64&distro=alpine-3.21.3"
    },
    {
      "bom-ref": "pkg:apk/alpine/musl@1.2.5-r9?arch=x86_64&distro=alpine-3.21.3",
      "type": "library",
      "supplier": { "name": "Alpine Linux" },
      "name": "musl",
      "version": "1.2.5-r9",
      "licenses": [{ "license": { "id": "MIT" } }],
      "purl": "pkg:apk/alpine/musl@1.2.5-r9?arch=x86_64&distro=alpine-3.21.3"
    }
  ],
  "dependencies": [
    {
      "ref": "image",
      "dependsOn": [
        "pkg:apk/alpine/busybox@1.37.0-r12?arch=x86_64&distro=alpine-3.21.3",
        "pkg:apk/alpine/musl@1.2.5-r9?arch=x86_64&distro=alpine-3.21.3"
      ]
    },
    {
      "ref": "pkg:apk/alpine/busybox@1.37.0-r12?arch=x86_64&distro=alpine-3.21.3",
      "dependsOn": ["pkg:apk/alpine/musl@1.2.5-r9?arch=x86_64&distro=alpine-3.21.3"]
    }
  ]
}
```

:::

The package versions above are illustrative. Real generators add much more: hashes, CPEs, files, and tool-specific properties.

## Packages and components

SPDX calls an entry a **package**; CycloneDX calls it a **component**. SBOMVert normalizes both into one internal package record (`ISbomPackage` in `src/models/ISbom.ts`) with a name, version, supplier, license, package type, first hash, purl, CPE and a comparison key.

How each parser builds that list (`src/lib/parseSbom.ts`, `src/lib/sbom/cyclonedx/parser.ts`):

- **SPDX.** Every entry of `packages[]` is kept. The purl is the first `externalRefs` entry with category `PACKAGE-MANAGER` and type `purl`. When two packages have the same purl, only the first is kept. Packages without a purl are kept too and are matched by name and version.
- **CycloneDX.** Nested `components` are flattened. Only components that have a `purl` are kept, and duplicates of a purl are dropped. `metadata.component` (the image) is not a package.

The **package type** shown in the UI (`os`, `npm`, `python`, `maven`, `golang`, ...) is derived from the purl type. For example `pkg:apk/...`, `pkg:deb/...` and `pkg:rpm/...` count as `os` packages.

The [analysis view](/guides/analyze-sbom) uses a slightly different reading. For SPDX it skips the `CONTAINER` and `OPERATING-SYSTEM` packages, and it skips packages with no version unless their purpose is `APPLICATION`.

## Dependencies and relationships

SBOMVert does not build or display a dependency graph. Relationships matter in two places only:

- **SPDX analysis.** `CONTAINS` relationships from a package to files are used to list each package's files in the analysis view.
- **Format conversion.** When an SBOM is converted between SPDX and CycloneDX, `DEPENDS_ON` relationships become CycloneDX `dependencies` and back again, and SPDX `DESCRIBES` points at the image. Other SPDX relationship types have no CycloneDX equivalent and are dropped. See [Translation limitations](https://github.com/sbomvert/sbomvert/blob/main/TRANSLATION_LIMITATIONS.md).

## Licenses

SBOMVert reads licenses for display and comparison. It does not evaluate license compliance.

- **SPDX:** the package's `licenseDeclared`, or `licenseConcluded` if there is no declared license. `NONE` and `NOASSERTION` count as no license.
- **CycloneDX:** the first entry of `licenses[]`, which can be an `expression`, a `license.id` or a `license.name`.
- **Analysis view:** counts how many packages have a declared license, how many have only a concluded license (shown as "deducted", SPDX only) and how many have none.
- **Comparison view:** when tools report different licenses for the same package, the package is flagged as having a metadata conflict. See [Why tools disagree](/concepts/tool-disagreement#metadata-conflicts).
- **Conversion:** a CycloneDX license list becomes a single SPDX expression. IDs are joined with `AND`, and free-text names become `LicenseRef-` identifiers.

## Related

- [Package URLs (pURL)](/concepts/purl)
- [Why tools disagree](/concepts/tool-disagreement)
- [SBOM translation](/concepts/translation)
- [Analyze an SBOM](/guides/analyze-sbom)
