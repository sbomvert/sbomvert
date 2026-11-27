---
title: Add your own SBOMs and CVE reports
description: Bring your own SBOMs and CVE reports into SBOMVert, with the folder layout and file names it expects, the Upload SBOM page, and the tool commands that produce matching files.
---

# Add your own SBOMs and CVE reports

SBOMVert's comparison pages read SBOMs and CVE reports from storage: a pair of folders, or an S3 bucket. This guide shows how to lay out your own files so SBOMVert finds them, how to upload an SBOM from the app, and how to generate files that match what SBOMVert expects.

## Folder layout and file names

Reports are grouped by container image, one file per tool and format:

```text
<SBOM_DIR>/<image-folder>/<tool>.<format>.json
<CVE_DIR>/<image-folder>/<tool>.<format>.json
```

- `<format>` is `spdx` or `cdx` (CycloneDX). For a CVE report, it is the format of the SBOM that was scanned.
- `<tool>` is the tool's short name. SBOMVert's own scans use `syft`, `trivy`, `scout`, `amazon`, `osv` and `cdxgen` for SBOMs, and `trivy` and `grype` for CVE reports.
- Only files ending in `.json` are listed.

`<image-folder>` is the image reference with `:` replaced by `twodots` and `/` replaced by `slash`:

| Image | Folder |
| --- | --- |
| `alpine:3.20` | `alpinetwodots3.20` |
| `library/nginx:1.27` | `libraryslashnginxtwodots1.27` |
| `ghcr.io/acme/app:1.0` | `ghcr.ioslashacmeslashapptwodots1.0` |

A complete example for one image:

```text
public/
├── sbom/
│   └── alpinetwodots3.20/
│       ├── syft.spdx.json
│       ├── syft.cdx.json
│       ├── trivy.spdx.json
│       └── trivy.cdx.json
└── cve/
    └── alpinetwodots3.20/
        ├── grype.spdx.json    # Grype's scan of syft.spdx.json
        └── trivy.cdx.json     # Trivy's scan of trivy.cdx.json
```

What depends on the names:

- The image list on the comparison pages comes from the **SBOM** folder. An image with CVE reports but no SBOMs does not appear.
- **SBOM comparison** labels each SBOM with the tool name written inside the SBOM, not the file name.
- **CVE comparison** labels each report with its file name: `grype.spdx.json` is shown as `grype (SPDX)`.

## Point SBOMVert at your files

### Local folders

Set the storage backend and the two folders:

```bash
ARTIFACT_BACKEND_TYPE=local
SBOM_DIR=public/sbom
CVE_DIR=public/cve
```

| Variable | Default | Notes |
| --- | --- | --- |
| `SBOM_DIR` | `./public/sbom` | Created if missing. |
| `CVE_DIR` | `./public/cves` | Note the `s`: set it if your folder is `cve`. Created if missing. |

Relative paths are resolved from the directory the app runs in: the repository root for `npm run dev`, `/app` in the container image.

::: details What about `ARTIFACT_ROOT`?
`ARTIFACT_ROOT` (default `./public`) is read only by the artifact storage service in `src/services/artifactStorageService/`. No current page or API route uses that service, so `ARTIFACT_ROOT` has no effect on the comparison pages. Use `SBOM_DIR` and `CVE_DIR`.
:::

New files are picked up on the next page load; there is no index to rebuild.

### S3

With `ARTIFACT_BACKEND_TYPE=s3`, SBOMs are read from the `sbomvert` bucket under the `sbom/` prefix and CVE reports under `cves/`, with the same `<image-folder>/<tool>.<format>.json` layout below them. The bucket and these prefixes are fixed in the code. See [S3 storage](/guides/s3-storage) for the connection settings.

## Upload an SBOM in the app

The **Upload SBOM** page adds one SBOM to storage, where the comparison pages find it.

### Enable it

Set `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD=true`. The flag is off by default and always off in the static build. When it is on, **Upload SBOM** appears in the sidebar. The flag is read when the app is built for the browser code; see the [installation notes](/getting-started/installation#docker-container).

With local storage, the SBOM folder must be writable by the app.

### Upload

1. Click **Upload SBOM** in the sidebar (`/compare/upload/sbom`).
2. Fill in **SBOM Name** and **Container Name**. Both are required. **Container Name** is the image reference, for example `alpine:3.24`; it decides the image folder. **SBOM Name** is not stored.
3. Choose the file in **SBOM File (JSON)**. This page takes a file only, not pasted JSON.
4. Check the detected **Format**, **Tool** and **Vendor**. Correct **Tool** if needed; it is required.
5. Click **Upload SBOM**.

**Expected result:** "SBOM "&lt;name&gt;" uploaded". The file is stored as `<image-folder>/<tool>.<format>.json`, where `<tool>` is the **Tool** field in lower case with spaces replaced by `-` (for example `Docker Scout` becomes `docker-scout`). A file with the same name is overwritten.

::: tip Match the existing names
If your other SBOMs use `scout` for Docker Scout, change the **Tool** field to `scout` before uploading, so the files stay consistent.
:::

The server checks the upload before storing it:

| Problem | Response |
| --- | --- |
| Upload disabled | 403 `SBOM upload is not enabled` |
| No file, or no container name | 400 |
| Not JSON | 400 `Invalid JSON format. Please provide a valid SBOM file` |
| JSON without `spdxVersion` or `bomFormat` | 400 `Unknown SBOM format. Expected SPDX or CycloneDX format` |
| SPDX that cannot be parsed | 400 `Failed to parse SPDX SBOM` |
| Container or tool name that is not a single path segment | 400 `Invalid container or file name` |

The endpoint is `POST /api/sbom/upload`.

### CVE reports cannot be uploaded yet

There is no working CVE report upload in the current version. A page exists at `/compare/upload/cve-report`, but it is not linked from the app and relies on API routes that are not implemented. Add CVE reports to storage directly, or produce them with [live scans](/guides/live-scans).

## Generate SBOMs yourself

These are the commands SBOMVert's scan worker runs (from `packages/scan/src/sbom/generator.ts`). Run them yourself and save the output under the matching file name. Replace `<image>` with the image reference.

::: code-group

```bash [Syft]
# SPDX and CycloneDX in one run
syft registry:<image> \
  -o spdx-json=syft.spdx.json \
  -o cyclonedx-json=syft.cdx.json
```

```bash [Trivy]
trivy image --image-src remote --format spdx-json --output trivy.spdx.json <image>
trivy image --image-src remote --format cyclonedx --output trivy.cdx.json <image>
```

```bash [Docker Scout]
docker scout sbom registry://<image> --format=spdx --output scout.spdx.json
docker scout sbom registry://<image> --format=cyclonedx --output scout.cdx.json
```

```bash [Amazon Inspector]
# CycloneDX only
inspector-sbomgen container --image <image> --disable-progress-bar -o amazon.cdx.json
```

```bash [OSV-Scanner]
# SPDX only; reads the image from an archive
skopeo copy docker://<image> docker-archive:image.tar
osv-scanner scan image --archive --all-packages --format spdx-2-3 \
  --output-file osv.spdx.json image.tar
```

```bash [cdxgen]
# CycloneDX only; reads the image from an archive
skopeo copy docker://<image> docker-archive:image.tar
cdxgen -t docker -o cdxgen.cdx.json image.tar
```

:::

Notes:

- The worker also passes `--skip-db-update --skip-java-db-update --cache-backend memory --timeout 15m` to Trivy, because it manages Trivy's databases itself. Leave these out when you run Trivy by hand, so Trivy downloads its databases.
- Docker Scout needs a Docker Hub login.
- OSV-Scanner exits with code 1 when the packages have known vulnerabilities, after writing the SBOM.
- SBOMVert does not read cdxgen's SPDX output (SPDX 3.0), and OSV-Scanner's CycloneDX output leaves out OS packages, which is why the worker uses one format for each.

Then copy the files into `<SBOM_DIR>/<image-folder>/`.

## CVE report files

CVE reports are **not** stored as the raw output of the scanners. The scan worker runs the scanner on an SBOM, then normalizes its JSON output into SBOMVert's report format before storing it. The CVE comparison reads only that format, so a raw `grype -o json` or `trivy --format json` file placed in `cve/` will not display correctly.

The scanner commands the worker runs (from `packages/scan/src/vuln/scanner.ts`):

```bash
trivy sbom trivy.cdx.json --skip-db-update --format json
grype sbom:syft.spdx.json -o=json
```

The normalization is done by `extractTrivyVulnerabilities` and `extractAnchoreVulnerabilities` in `packages/core/src/vuln/vulnutils.ts` (the `VULN_EXTRACTORS` map). SBOMVert has no command-line tool for this step. To get CVE reports in the right format, use [live scans](/guides/live-scans), or call those functions from your own script.

A stored report looks like this:

```json
{
  "totalCVEs": 1,
  "cves": ["CVE-2026-85091"],
  "library": 1,
  "language": 0,
  "packagelist": [],
  "vulns_by_package": {
    "pkg:apk/alpine/zlib@1.3.2-r0": ["CVE-2026-85091"]
  },
  "vulnpackagelist": {
    "pkg:apk/alpine/zlib@1.3.2-r0": ["CVE-2026-85091"]
  },
  "purl_mapping": {
    "pkg:apk/alpine/zlib@1.3.2-r0": "pkg:apk/alpine/zlib@1.3.2-r0?arch=x86_64&distro=3.24.2"
  }
}
```

Reports from the live-scan worker also have a `cveDetails` object, keyed by vulnerability ID, with severity, score, fix and advisory details. It is optional: the comparison works without it. See [Severity, fix and details](/concepts/vulnerabilities#severity-fix-and-details).

The comparison view uses `totalCVEs`, `cves` and `vulns_by_package`. Name the file after the scanner and the format of the SBOM it scanned, for example `grype.spdx.json` for Grype's scan of `syft.spdx.json`.

## Related

- [Live scans](/guides/live-scans)
- [S3 storage](/guides/s3-storage)
