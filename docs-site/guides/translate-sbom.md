---
title: Translate an SBOM
description: Rewrite an SBOM the way another tool writes it, and convert between SPDX and CycloneDX, with SBOMVert's Translate SBOM page.
---

# Translate an SBOM

The **Translate SBOM** page rewrites an SBOM as another tool would have written it, in SPDX or CycloneDX. Use it when a scanner or pipeline expects SBOMs in one tool's style, or to convert between the two formats.

The translation runs in your browser. In the [static build](/guides/static-build), the SBOM never leaves it. Try it without installing anything at [sbomvert.jackops.dev/translate](https://sbomvert.jackops.dev/translate/).

::: warning A translation only carries what the original SBOM contains
Translation does not rescan the image. Information the original tool did not write down cannot be added, and some fields have no equivalent in the target. Read [Translation limitations](https://github.com/sbomvert/sbomvert/blob/main/TRANSLATION_LIMITATIONS.md) before you rely on a translated SBOM.
:::

## Supported sources and targets

| Tool | Read and write SPDX | Read and write CycloneDX |
| --- | --- | --- |
| Syft | Yes | Yes |
| Trivy | Yes | Yes |
| Docker Scout | Yes | Yes |
| Amazon Inspector | Yes | Yes |
| Google (Artifact Analysis) | Yes | No |
| Microsoft (sbom-tool) | Yes | No |

Any supported source can be translated into any supported target, except into exactly the same tool and format. When the formats differ, SBOMVert also converts between SPDX and CycloneDX.

## Translate an SBOM

### 1. Choose the input

Open **Translate SBOM** in the sidebar (`/translate`) and choose a **Source**:

- **Paste JSON** (default): paste the SBOM into the **SBOM** box.
- **File from my computer**: choose a JSON file.
- **Stored SBOM** (not in the static build): type an image in **Image**, for example `alpine:3.24`; matching stored images are suggested as you type. Then pick a file in **Stored file**.

Switching the source clears the input, the selections and any error.

**Expected result:** the **From** field becomes active. If the input is not JSON, the page shows "The file is not valid JSON"; if it is JSON but neither SPDX nor CycloneDX, "Not an SPDX or CycloneDX SBOM".

### 2. Check the source tool

SBOMVert reads which tool made the SBOM:

- in SPDX, from `creationInfo.creators` (for example `Tool: syft-1.18.1`);
- in CycloneDX, from `metadata.tools` (CycloneDX 1.4) or `metadata.tools.components` (1.5 and later).

It recognizes `syft`, `trivy`, `docker-scout`, `google`, `amazon inspector`, `inspector-sbomgen` and `microsoft.sbomtool`. When it finds one that it can read in this format, **From** is filled in and shows "Tool detected". Otherwise it shows "Tool not detected: choose it".

You can change **From**. If you choose a tool other than the detected one, the page warns that the translation will be wrong if the SBOM was not made by that tool. Each translator expects the conventions of its own tool, so choose the tool that actually produced the SBOM.

### 3. Choose the target

Pick a target in **Translate to**. Options are labelled `<tool> · <format>`, for example `Trivy · CycloneDX`, sorted by tool name.

### 4. Translate

Click the button:

- In **Paste JSON** mode, **Translate** shows the result in the **Translation** box. Use **Copy** to copy it.
- In the other modes, **Translate & download** downloads the result as a JSON file.

If the translation fails, the error is shown above the button.

## Downloaded file names

The downloaded file is named `<input>.<target-tool>.<format>.json`:

- `<input>` is the uploaded file's name without `.json` and without a `.spdx`, `.cdx`, `.cyclonedx` or `.bom` before it. For a stored SBOM, it is the image name with `:` and `/` replaced by `-`.
- `<target-tool>` is `syft`, `trivy`, `scout`, `amazon`, `google` or `microsoft`.
- `<format>` is `spdx` or `cdx`.

| Input | Target | Downloaded file |
| --- | --- | --- |
| File `alpine-3.20.spdx.json` | Trivy · CycloneDX | `alpine-3.20.trivy.cdx.json` |
| File `app.cdx.json` | Docker Scout · SPDX | `app.scout.spdx.json` |
| Stored `alpine:3.24.4`, `syft.spdx.json` | Trivy · SPDX | `alpine-3.24.4.trivy.spdx.json` |

## Example input

A minimal SPDX 2.3 SBOM made by Syft, with one Alpine package. Paste it in **Paste JSON** mode: **From** shows `Syft · SPDX` with "Tool detected".

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "alpine:3.20",
  "documentNamespace": "https://anchore.com/syft/image/alpine-3.20-0b1c2d3e",
  "creationInfo": {
    "licenseListVersion": "3.25",
    "creators": ["Organization: Anchore, Inc", "Tool: syft-1.18.1"],
    "created": "2026-11-01T10:00:00Z"
  },
  "packages": [
    {
      "name": "busybox",
      "SPDXID": "SPDXRef-Package-apk-busybox-1",
      "versionInfo": "1.36.1-r29",
      "supplier": "Person: Sören Tempel <soeren+alpine@soeren-tempel.net>",
      "downloadLocation": "https://busybox.net/",
      "filesAnalyzed": false,
      "licenseConcluded": "NOASSERTION",
      "licenseDeclared": "GPL-2.0-only",
      "copyrightText": "NOASSERTION",
      "externalRefs": [
        {
          "referenceCategory": "SECURITY",
          "referenceType": "cpe23Type",
          "referenceLocator": "cpe:2.3:a:busybox:busybox:1.36.1-r29:*:*:*:*:*:*:*"
        },
        {
          "referenceCategory": "PACKAGE-MANAGER",
          "referenceType": "purl",
          "referenceLocator": "pkg:apk/alpine/busybox@1.36.1-r29?arch=x86_64&distro=alpine-3.20.3"
        }
      ]
    }
  ],
  "relationships": [
    {
      "spdxElementId": "SPDXRef-DOCUMENT",
      "relatedSpdxElement": "SPDXRef-Package-apk-busybox-1",
      "relationshipType": "DESCRIBES"
    }
  ]
}
```

Translated to `Trivy · CycloneDX`, the result is a CycloneDX 1.6 document. Following Trivy's conventions, it adds an `operating-system` component for Alpine 3.20.3 (taken from the pURL's `distro` qualifier) next to the `busybox` library component, which keeps its supplier, license, CPE and pURL.

## Related

- [SBOM translation](/concepts/translation)
- [Analyze an SBOM](/guides/analyze-sbom)
- [Static build](/guides/static-build)
