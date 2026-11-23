---
title: Architecture
description: How the SBOMVert web app, workspace packages, scan worker, Redis, storage and optional Postgres fit together.
---

# Architecture

SBOMVert is a Next.js (App Router) application in an npm workspaces repository. The app reads SBOMs and CVE reports from storage and compares them in the browser. An optional scan worker generates new reports on demand. This page describes each component and how data moves between them.

## Components

| Component | Where | Role |
|---|---|---|
| Web app | repository root (`sbom-comparator`) | Pages (`src/app`) and API routes (`src/app/api`). Reads and writes SBOMs and CVE reports through `@sbomvert/storage`. Queues scans and stores their results. |
| `@sbomvert/core` | `packages/core` | SBOM, purl and CVE logic with no React or Next dependency: SPDX and CycloneDX types, purl parsing, translation between tools and formats, CVE report parsers (`VULN_EXTRACTORS`). |
| `@sbomvert/scan` | `packages/scan` | Shared by the app and the worker: the BullMQ `scan` queue and flow definition, image reference validation, the list of tools, and the commands that run them. |
| `@sbomvert/storage` | `packages/storage` | SBOM and CVE report storage, either a local folder or S3, selected by `ARTIFACT_BACKEND_TYPE`. Used only by the web app. |
| Scan worker | `worker` (`@sbomvert/scan-worker`) | Takes jobs from the `scan` queue, runs the SBOM and CVE tools, and returns the results as the job's return value. Stores nothing. Built from `worker/Dockerfile`. |
| Redis | `redis:7-alpine` | Backend for the BullMQ queue. Needed only for live scans. |
| Object storage | SeaweedFS in Compose and Helm, or any S3 endpoint | Holds SBOMs and CVE reports when `ARTIFACT_BACKEND_TYPE=s3`. |
| Postgres | `postgres` Compose service (`auth` profile) | Stores users, sessions and API keys for the optional sign-in feature (better-auth). Not used for SBOM or CVE data. |

The workspace packages are consumed as TypeScript source (`@sbomvert/core/<module>`) and transpiled by Next (`transpilePackages` in `next.config.js`) or run by `tsx` in the worker.

```text
                    ┌──────────────────────────── Web app (Next.js) ─────────────────────────────┐
 Browser ──HTTP──▶  │  pages: /compare, /compare/analyze, /translate, /scan, /auth, /settings    │
                    │  API routes: /api/sbom*, /api/cve*, /api/scan*, /api/auth/*                 │
                    │       │                     │                        │                      │
                    │  @sbomvert/storage    @sbomvert/scan (queue)    better-auth                 │
                    └───────┼─────────────────────┼────────────────────────┼──────────────────────┘
                            ▼                     ▼                        ▼
                ┌───────────────────────┐   ┌──────────┐            ┌────────────┐
                │ local folder (SBOM_DIR│   │  Redis   │            │  Postgres  │
                │ CVE_DIR) or S3 bucket │   │ (BullMQ) │            │ (auth only)│
                │ `sbomvert`            │   └────┬─────┘            └────────────┘
                └───────────────────────┘        │ jobs / return values
                                                 ▼
                                        ┌──────────────────┐     registries
                                        │   Scan worker    │ ──▶ (images pulled
                                        │ syft, trivy, ... │      by the tools)
                                        └──────────────────┘
```

## The web app

Pages under `src/app` are mostly client components that call the app's own API routes. The routes are thin wrappers: they validate input, call `@sbomvert/storage` or `@sbomvert/scan`, and return JSON. Parsing and comparison of SBOMs happens in the browser with code from `src/lib` and `@sbomvert/core`.

API routes, grouped by purpose:

- **Reading data:** `GET /api/sbom-files` (paged list of images), `GET /api/sbom/image`, `GET /api/sbom/[image]/[file]`, `GET /api/cve`, `GET /api/cve/[image]/[file]`.
- **Uploading:** `POST /api/sbom/upload`, only when `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD=true`.
- **Live scans:** `POST /api/scan`, `GET /api/scan/status/[jobId]`, `GET /api/scan/status/recent`, `GET /api/scan/tools`.
- **Sign-in:** `/api/auth/[...all]` (better-auth), only when `NEXT_PUBLIC_ENABLE_AUTH=true`.

### Feature flags

Flags live in `src/lib/featureFlags.ts` and are read through getters, not cached at import time:

| Flag (env var) | Effect when `true` |
|---|---|
| `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD` | Enables SBOM upload. |
| `NEXT_PUBLIC_ENABLE_SCAN_API` | Enables `/scan` and `/api/scan/*`. Read at runtime on the server, so a built image can toggle it. Without it, `src/proxy.tsx` redirects those paths to `/`. |
| `NEXT_PUBLIC_CVE_MAPPING_ENABLED` | Shows the "CVE Comparison" choice on `/compare`. |
| `NEXT_PUBLIC_ENABLE_AUTH` | Enables sign-in, `/auth/*`, `/settings/*`, and requires a session or API key for `/api/scan/*`. Off: those pages return 404. |
| `NEXT_PUBLIC_STATIC_MODE` | Set by `npm run build:static`. Forces upload, scans and auth off. |

### Startup hook

`src/instrumentation.ts` runs once when the Node.js server starts. When scans are enabled it subscribes to the queue's `completed` events and stores each finished job's SBOMs and CVE reports. It then stores the results of any jobs that completed while the app was not running. See [Scan pipeline](/architecture/scan-pipeline).

## Data flow: pre-generated dataset

This is the default path. Reports are JSON files that already exist in storage, laid out as `<image>/<tool>.<format>.json`.

```text
 SBOM_DIR/<image>/<tool>.<spdx|cdx>.json      (or s3://sbomvert/sbom/...)
 CVE_DIR/<image>/<tool>.<spdx|cdx>.json       (or s3://sbomvert/cves/...)
              │
              ▼
 @sbomvert/storage  (LocalSbomService / S3SbomService, LocalCVEService / S3CVEService)
              │
              ▼
 API routes:  /api/sbom-files ─▶ image list (one entry per <image> folder)
              /api/cve?image= ─▶ CVE file list per image
              /api/sbom/image?name= ─▶ SBOM file list per image
              /api/sbom/<image>/<file> ─▶ raw SBOM JSON
              │
              ▼
 Browser: parse SPDX / CycloneDX (src/lib/sbom, @sbomvert/core)
          ─▶ match packages by purl ─▶ diff across tools (src/lib/diffReports.ts)
          ─▶ /compare views
```

## Data flow: live scans

Live scans are off by default. They need `NEXT_PUBLIC_ENABLE_SCAN_API=true`, Redis, and the scan worker.

```text
 Browser /scan or HTTP client
      │ POST /api/scan {image, tools, formats}
      ▼
 Web app ── validates, builds a BullMQ flow ──▶ Redis (queue "scan")
      ▲                                              │
      │                                              ▼
      │                                     Scan worker: runs sbom jobs (syft, trivy, ...)
      │                                     then cve jobs (trivy, grype) on those SBOMs
      │                                              │ job return value: {image, sboms[], cves[]}
      │   `completed` event                          ▼
      └──────────────────────────────────────── Redis
      │
      ▼
 Web app stores each result with @sbomvert/storage
   ─▶ SBOM_DIR/<sanitized image>/<tool>.<format>.json
   ─▶ CVE_DIR/<sanitized image>/<tool>.<format>.json
   ─▶ the image appears in /compare
```

The worker has no storage credentials and no Docker daemon. It only needs Redis and network access to registries. See [Scan pipeline](/architecture/scan-pipeline) for the job tree and timing.

## Static build

`npm run build:static` sets `NEXT_PUBLIC_STATIC_MODE=true`. `next.config.js` then switches to `output: 'export'` and only builds files named `*.static.tsx`: the home page, `/compare/analyze`, `/compare/analyze/local` and `/translate`. There are no API routes, so SBOMs are parsed and translated in the browser and never uploaded. Comparison of stored data, upload, scans and sign-in are not included. Set `NEXT_PUBLIC_BASE_PATH` when the site is served under a sub-path. See [Static build](/guides/static-build).

## Deployment options

| | Docker Compose (`docker-compose.yml`) | Helm (`charts/sbomvert`) |
|---|---|---|
| Purpose | Local development: mounts the source and runs `npm run dev` / `npm run worker:dev` | Cluster deployment from published images |
| App | `nextjs` service, `Dockerfile.dev`, port 3000 | `<release>-app` Deployment, image `ghcr.io/sbomvert/sbomvert` (`Dockerfile`, standalone server) |
| Worker | `scan-worker` service, `worker/Dockerfile` | `<release>-worker`, only when `scan.enabled` |
| Redis | `redis` service | `<release>-redis` Deployment, Service `redis` |
| S3 | `seaweedfs` + one-shot `seaweedfs-init` that creates the bucket | `<release>-seaweedfs`, creates the bucket on start; can be disabled |
| Postgres | `postgres` service, `auth` profile only | Not included |
| Settings | `.env.dev` (all features on, local storage) | `values.yaml` (S3 storage by default) |
| Vulnerability DB cache | external volume `sbomvert-scan-dbs` | PVC `<release>-worker-dbs` |

See [Installation](/getting-started/installation) and [Deploy on Kubernetes](/guides/kubernetes).

## Related

- [Scan pipeline](/architecture/scan-pipeline)
- [Storage backends](/architecture/storage)
- [Security overview](/security/)
