---
title: Storage backends
description: How SBOMVert stores SBOMs and CVE reports in a local folder or an S3 bucket, and how files map to paths and keys.
---

# Storage backends

SBOMVert keeps SBOMs and CVE reports as JSON files, one per tool and format, grouped by container image. Where those files live is chosen by one environment variable, `ARTIFACT_BACKEND_TYPE`: a local folder (`local`, the default) or an S3-compatible bucket (`s3`).

## Where storage is used

Only the web app touches storage. It reads files for the compare and analyze pages, writes uploads, and writes the results of live scans when the worker reports them. The scan worker never reads or writes storage; it returns results through Redis (see [Scan pipeline](/architecture/scan-pipeline)).

```text
 API routes (/api/sbom*, /api/cve*)      scan results (src/services/scanResults.ts)
              │                                        │
              ▼                                        ▼
   @sbomvert/storage/sbom/sbomStorageService   @sbomvert/storage/cve/cveStorageService
              │                                        │
     ARTIFACT_BACKEND_TYPE=local?            ARTIFACT_BACKEND_TYPE=local?
        │ yes            │ no (s3)              │ yes            │ no (s3)
        ▼                ▼                      ▼                ▼
  LocalSbomService   S3SbomService        LocalCVEService    S3CVEService
  (SBOM_DIR)         (bucket sbomvert,    (CVE_DIR)          (bucket sbomvert,
                      prefix sbom/)                           prefix cves/)
```

## The `@sbomvert/storage` package

`packages/storage` holds two services with the same pattern: an interface, a local implementation, an S3 implementation, and a module that picks one when it is first imported.

| Service | Interface | Local | S3 | Selector |
|---|---|---|---|---|
| SBOMs | `sbom/sbomService.types.ts` (`ISbomService`) | `sbom/localSbomService.ts` | `sbom/sbomServiceS3.ts` | `sbom/sbomStorageService.ts` |
| CVE reports | `cve/cveStorageService.types.ts` (`CVEServiceType`) | `cve/localcveStorageService.ts` | `cve/cveStorageServiceS3.ts` | `cve/cveStorageService.ts` |

The selector reads `ARTIFACT_BACKEND_TYPE` once, at import. Any value other than `s3` selects the local implementation. Change the variable and restart the app to switch.

`safePath.ts` guards the local implementations: an image or file name from a request must be a single path segment (no `/`, `\`, `.` or `..`), so a request cannot read or write outside the configured folder.

## Local backend

| Setting | Default in code | Used for |
|---|---|---|
| `SBOM_DIR` | `./public/sbom` | SBOM folder |
| `CVE_DIR` | `./public/cves` | CVE report folder |
| `CVE_RAW_DIR` | `./public/cve-raw` | The scanners' own output from live scans, kept apart from the reports. |

::: warning Default CVE folder name
The code defaults to `./public/cves`. Set `CVE_DIR` explicitly so the app reads the folder you expect.
:::

Paths are relative to the app's working directory. The SBOM service creates `SBOM_DIR` if it does not exist, so a wrong path gives an empty `/compare` page rather than an error.

Layout:

```text
<SBOM_DIR>/
  <image>/
    <tool>.<spdx|cdx>.json
<CVE_DIR>/
  <image>/
    <tool>.<spdx|cdx>.json      # format = the format of the SBOM that was scanned
```

Each sub-folder of `SBOM_DIR` is one image in the `/compare` list. CVE reports are looked up in the folder with the same name under `CVE_DIR`. Only files ending in `.json` are listed.

## S3 backend

With `ARTIFACT_BACKEND_TYPE=s3`, both services use the bucket **`sbomvert`**, which is fixed in code. `S3_BUCKET` and `S3_PREFIX` do not change it (see below).

| Data | Key |
|---|---|
| SBOM | `sbom/<image>/<tool>.<format>.json` |
| CVE report | `cves/<image>/<tool>.<format>.json` |
| CVE raw output | `cve-raw/<image>/<tool>.<format>.json`, or `<CVE_RAW_PREFIX>` if set |

The S3 client is configured from:

| Variable | Default | Notes |
|---|---|---|
| `S3_ENDPOINT` | unset | Custom endpoint (SeaweedFS, MinIO, other providers). Unset means AWS. |
| `S3_FORCE_PATH_STYLE` | `false` | `true` sends `endpoint/bucket/key` instead of `bucket.endpoint/key`. Needed for SeaweedFS and most self-hosted S3. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | unset | Used **only when `S3_ENDPOINT` is set**. Without an endpoint, the AWS SDK's default credential chain is used (for example `AWS_ACCESS_KEY_ID`, a shared profile, or an IAM role). |
| `AWS_REGION` | `us-east-1` | Region for request signing. |

Listing reads every object under the prefix, then groups keys by their first path segment. Listing errors are logged on the server (`Error listing SBOMs from S3:`) and return an empty list, so permission problems show up as an empty `/compare` page. See [S3 storage](/guides/s3-storage) for setup.

## Image names in storage

Image references contain `/` and `:`, which cannot appear in a single folder or key segment. Live scans and uploads store images under a sanitized name: `/` becomes `slash` and `:` becomes `twodots` (`SanitizeContainerImage` in `packages/scan/src/image.ts`). For example:

| Image | Folder / key segment |
|---|---|
| `alpine:3.20` | `alpinetwodots3.20` |
| `library/nginx:1.27` | `libraryslashnginxtwodots1.27` |

The UI converts the name back for display. Use the same convention when you add your own files (see [Add your own reports](/guides/add-reports)).

## `src/services/artifactStorageService`

This folder contains a second, richer storage model: "subjects" (container, repository or other) with versioned SBOM and CVE artifacts, metadata files and an index. It has local and S3 implementations and is selected the same way:

| Backend | Root | Variables |
|---|---|---|
| local | `<ARTIFACT_ROOT>/subjects/...`, `<ARTIFACT_ROOT>/index/...` | `ARTIFACT_ROOT` (default `./public`) |
| s3 | `<S3_PREFIX>subjects/...`, `<S3_PREFIX>index/...` in `S3_BUCKET` | `S3_BUCKET` (default `sbomvert`), `S3_PREFIX` (default `artifacts/`) |

No API route in the current code uses this service; only its types are imported by the CVE report upload page. The compare, analyze, upload and scan features all go through `@sbomvert/storage` described above. `S3_BUCKET`, `S3_PREFIX` and `ARTIFACT_ROOT` therefore do not affect where SBOMs and CVE reports used by `/compare` are stored.

## Changing a backend

Both implementations of a `*.types.ts` interface must stay in sync. When you add a method or change behavior, update the local and S3 versions together, and keep the key layout identical so data can be copied between backends without renaming.

## Related

- [Use S3 storage](/guides/s3-storage)
- [Add your own reports](/guides/add-reports)
- [Architecture overview](/architecture/)
