---
title: Package URLs (pURL)
description: How a Package URL identifies a package, and how SBOMVert turns purls into comparison keys to match the same package across tools.
---

# Package URLs (pURL)

A **Package URL (purl)** is a string that identifies a software package independently of the tool that found it. Both SPDX and CycloneDX can carry one per package (see [SBOMs, SPDX and CycloneDX](/concepts/sbom)). Purls are central to SBOMVert: they are the main thing it uses to decide whether two tools are describing the same package.

## Anatomy

A purl has up to seven parts:

```text
pkg:type/namespace/name@version?qualifiers#subpath
│   │    │         │    │       │          │
│   │    │         │    │       │          └─ path inside the package (optional)
│   │    │         │    │       └─ key=value pairs, e.g. arch, distro (optional)
│   │    │         │    └─ package version (optional)
│   │    │         └─ package name (required)
│   │    └─ vendor, distro, scope or group (optional, type-specific)
│   └─ package ecosystem: deb, apk, rpm, npm, pypi, golang, maven, ... (required)
└─ scheme, always "pkg"
```

Characters that have a meaning in the syntax are percent-encoded inside a part. For example, the `:` of a Debian epoch is written `%3A`, and the `@` of an npm scope is written `%40`.

## Examples

| Ecosystem | Example purl | Notes |
| --- | --- | --- |
| Debian (`deb`) | `pkg:deb/debian/diffutils@1%3A3.10-4?arch=arm64&distro=debian-13.7` | Namespace is the distro. `1:` is the epoch. |
| Alpine (`apk`) | `pkg:apk/alpine/musl@1.2.5-r9?arch=x86_64&distro=alpine-3.21.3` | `-r9` is the Alpine package release. |
| npm | `pkg:npm/%40angular/core@17.3.0` | Namespace is the scope `@angular`. |
| npm, unscoped | `pkg:npm/lodash@4.17.21` | No namespace. |
| Go (`golang`) | `pkg:golang/github.com/AzureAD/microsoft-authentication-library-for-go@v1.3.3` | Namespace is the module path up to the last `/`. Go versions keep their `v`. |
| Maven | `pkg:maven/org.ow2.asm/asm@9.7` | Namespace is the Maven group ID. |

The Debian, Alpine and Go examples come from the equivalence classes SBOMVert's translation is tested against (`packages/core/src/translate/equivalenceClasses.ts`).

## How SBOMVert parses a purl

`parsePackageUrl` (`packages/core/src/purl/packageUrl.ts`) splits a purl into `type`, `namespace`, `name`, `version`, `qualifiers` and `subpath`:

- It returns nothing for a string that does not start with `pkg:` or has no name.
- It lowercases the type and the qualifier keys, and drops qualifiers with an empty value.
- It percent-decodes every part.
- Only an `@` after the last `/` starts the version, so an unescaped npm scope (`pkg:npm/@angular/core@17.3.0`) is still read correctly.

`formatPackageUrl` writes a purl back. It sorts the qualifiers by key and percent-encodes each part.

The UI's package type (`os`, `npm`, `python`, `golang`, ...) is derived from the purl type. `deb`, `apk` and `rpm` are OS packages.

## The same package, three spellings

Purls are standardized, but tools still spell them differently. Here is one Debian package as Syft, Trivy and Docker Scout write it for the same image:

```text
Syft   pkg:deb/debian/diffutils@1%3A3.10-4?arch=arm64&distro=debian-13.7
Trivy  pkg:deb/debian/diffutils@3.10-4?arch=amd64&distro=debian-13.7&epoch=1
Scout  pkg:deb/debian/diffutils@1%3A3.10-4?os_distro=trixie&os_name=debian&os_version=13
```

Compared as strings, these are three different packages. The differences:

- **Epoch.** Syft and Scout put it in the version; Trivy puts it in an `epoch` qualifier.
- **Distro.** Syft and Trivy write `distro=debian-13.7`; Scout uses its own `os_*` qualifiers and only the major release.
- **Architecture.** Here the tools scanned different platforms (`arm64`, `amd64`), and Scout wrote no architecture at all.

[Why tools disagree](/concepts/tool-disagreement) covers these differences in more detail.

## Comparison keys

To match packages across tools, SBOMVert does not compare purls directly. It computes a **comparison key** for each package (`comparisonKey` in `packages/core/src/translate/comparisonKeys.ts`):

```text
<type>/<namespace>/<name>@<version>      all lowercased
```

The key is built with these rules:

1. **Only type, namespace, name and version count.** Qualifiers (architecture, distro, source package) and subpath are ignored, because tools disagree on them for the same package.
2. **The whole key is lowercased.** Trivy and Scout lowercase Go module paths, and Syft does not.
3. **No epoch.** The version is the version without its epoch.
4. **No leading `v` for language packages.** For anything that is not `deb`, `apk` or `rpm`, a `v` directly followed by a digit is removed (`v1.3.3` becomes `1.3.3`). Some tools write it and some do not.
5. **No Maven group.** A Maven key has an empty namespace (`maven//asm@9.7`). Tools disagree on the group of the same jar: Trivy writes `org.ow2.asm`, while Syft and Scout guess `org.objectweb.asm` from the Java packages inside it.
6. **No key for the image itself.** A package of type `oci` gets no key, because Trivy gives the image no purl. The image is then matched by name and version instead.

All three spellings of `diffutils` above get the same key:

```text
deb/debian/diffutils@3.10-4
```

Two Go spellings, `...AzureAD/microsoft-authentication-library-for-go@v1.3.3` (Syft) and `...azuread/microsoft-authentication-library-for-go@1.3.3` (a tool that lowercases and drops the `v`), both become:

```text
golang/github.com/azuread/microsoft-authentication-library-for-go@1.3.3
```

### Where the type, name and version come from

The key is only as good as the values it is built from. `comparisonKeys(doc)` reads them in one of two ways:

- **With the tool's translator.** If the SBOM was written by Syft, Trivy or Docker Scout (detected from SPDX `creationInfo.creators` or CycloneDX `metadata.tools`), SBOMVert reads each package with that tool's translator and builds the key from the resulting [canonical package](/concepts/translation#the-canonical-package). The translator knows the tool's conventions, for example that Trivy keeps the epoch in a qualifier.
- **From the purl alone.** For every other tool (Amazon Inspector, OSV-Scanner, cdxgen, Google, Microsoft, or an unrecognized tool), and for packages the translator does not cover, such as nested CycloneDX components, the purl is parsed directly. For OS packages, an epoch written in the version (`1:3.10-4`) is removed.

If the translator fails on a document, SBOMVert logs a warning and falls back to purl-only keys for the whole SBOM. If several packages in one SBOM share a purl, the first one's key is used.

### Packages without a purl

A package with no purl has no key. The compare view then matches it by `name@version` (see [Why tools disagree](/concepts/tool-disagreement#how-sbomvert-matches-packages)).

::: tip CVE reports use a different normalization
The CVE comparison does not use comparison keys. It matches packages with its own normalized purl, described in [Vulnerabilities and CVE reports](/concepts/vulnerabilities#matching-packages-across-scanners).
:::

## Related

- [SBOMs, SPDX and CycloneDX](/concepts/sbom)
- [Why tools disagree](/concepts/tool-disagreement)
- [SBOM translation](/concepts/translation)
- [Compare SBOMs](/guides/compare-sboms)
