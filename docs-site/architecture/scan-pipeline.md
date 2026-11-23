---
title: Scan pipeline
description: How a live scan moves from POST /api/scan through the BullMQ queue and the scan worker to stored SBOMs and CVE reports.
---

# Scan pipeline

A live scan generates SBOMs for a container image with one or more SBOM tools, then scans those SBOMs for CVEs. The web app queues the work in Redis, the scan worker runs the tools, and the web app stores what the worker returns. This page follows one scan through each step.

The code lives in `src/app/api/scan/route.ts`, `packages/scan/src/queue.ts`, `worker/src/index.ts`, `worker/src/processScan.ts` and `src/services/scanResults.ts`.

## Overview

```text
 1. POST /api/scan ──▶ 2. BullMQ flow in Redis ──▶ 3. worker runs sbom jobs
                                                      │
                                                      ▼
 6. job data trimmed ◀── 5. app stores results ◀── 4. worker runs cve jobs
                         (on each `completed` event)
```

## 1. The request

`POST /api/scan` takes a JSON body:

```json
{
  "image": "alpine:3.20",
  "tools": { "producers": ["syft", "trivy"], "consumers": ["grype", "trivy"] },
  "formats": ["spdx", "cdx"]
}
```

The route handler:

1. Returns `403 {"error":"Scan feature disabled"}` unless `NEXT_PUBLIC_ENABLE_SCAN_API=true`. In practice the proxy (`src/proxy.tsx`) already redirects `/api/scan/*` to `/` when the flag is off.
2. Validates the body with zod. `image` must pass `isValidImageRef` (no leading `-`, no `..`, no source scheme such as `dir:` or `file:`, at most 255 characters). `producers` and `consumers` must each contain at least one string. `formats` defaults to `["spdx","cdx"]`. Failures return `400` with the first validation message.
3. When `NEXT_PUBLIC_ENABLE_AUTH=true`, checks the `x-api-key` header or a session cookie and returns `401` otherwise.
4. Adds the flow to Redis and returns `202 {"jobId":"..."}`. If Redis is unreachable it returns `503 {"error":"Scan queue unavailable"}`.

Tool names are not checked against the tool list at this point. An unknown tool reaches the worker, which logs a warning and skips it.

## 2. The job flow

`buildScanFlow` turns one request into a BullMQ flow on the queue named `scan`. Every job is named after what it does:

```text
 scan              parent; its id is the jobId returned to the client
 ├─ cve trivy      scans the SBOM produced by its child
 │  └─ sbom trivy
 ├─ cve grype      grype reads syft's SBOM
 │  └─ sbom syft
 └─ sbom scout     producers that no requested scanner reads hang off the parent
```

Rules applied while building the flow:

- Each scanner reads one producer's SBOM: its own, unless the tool declares `sbom_from` (grype reads syft's).
- If that producer was not requested, no `cve` job is created. The parent job later logs `<scanner> needs a <producer> SBOM, which was not requested`.
- Children use `ignoreDependencyOnFailure`, so a failed tool never leaves the parent waiting.
- Finished jobs are kept for status pages, up to the last 500 completed and 500 failed (`removeOnComplete` / `removeOnFail`).

BullMQ runs children before parents, so `sbom` jobs run first, then `cve` jobs, then the `scan` parent.

## 3. SBOM jobs

For each `sbom` job, the worker asks `GenerateSBOMsWithTool` (`packages/scan/src/sbom/generator.ts`) for the commands to run. The worker has no Docker daemon: each tool pulls the image from its registry.

| Tool | Command (simplified) | Formats |
|---|---|---|
| `syft` | `syft registry:<image> -o spdx-json=<file> -o cyclonedx-json=<file>` (one run, one pull) | SPDX, CycloneDX |
| `trivy` | `trivy image --image-src remote --skip-db-update --skip-java-db-update --cache-backend memory --format <fmt> --output <file> <image>` (one run per format) | SPDX, CycloneDX |
| `scout` | `docker scout sbom registry://<image> --format=<fmt> --output <file>` (one run per format) | SPDX, CycloneDX |
| `amazon` | `inspector-sbomgen container --image <image> -o <file>` | CycloneDX only |
| `osv` | `skopeo copy docker://<image> docker-archive:<tar>`, then `osv-scanner scan image --archive --all-packages --format spdx-2-3 ...` | SPDX only |
| `cdxgen` | `skopeo copy ...`, then `cdxgen -t docker -o <file> <tar>` | CycloneDX only |

`osv-scanner` and `cdxgen` would otherwise need a Docker daemon, so `skopeo` first downloads the image to a `docker save`-style archive.

How the job behaves:

- Commands run with `execFile` (no shell), in a temporary directory that is deleted afterwards.
- A tool that is not a known producer logs `<tool> cannot produce SBOMs` and returns nothing.
- A format the tool cannot write produces no file and is logged as `no <tool> <FORMAT> SBOM`.
- A failed run is logged as a warning (`<tool> failed: ...`). Output that is not JSON is logged as `<tool> <FORMAT> SBOM failed: ...`. The job still completes with whatever did work.
- `trivy` waits for the vulnerability databases before it runs, because it needs its Java DB to identify JAR files even for SBOMs. Other producers start immediately.

The job returns `{ image, sboms: [{tool, format, content}], cves: [] }`.

## 4. CVE jobs

A `cve` job reads the return value of its child `sbom` job, writes each requested format's SBOM to a temporary file, and runs the scanner on it (`ScanSbomWithTool` in `packages/scan/src/vuln/scanner.ts`):

| Scanner | Command |
|---|---|
| `trivy` | `trivy sbom <file> --skip-db-update --format json` |
| `grype` | `grype sbom:<file> -o=json` |

The raw output is normalized by the tool's entry in `VULN_EXTRACTORS` (`packages/core/src/vuln/vulnutils.ts`) and returned as `{ image, sboms: [], cves: [{tool, format, content}] }`. The `format` of a CVE report is the format of the SBOM that was scanned.

- Only `trivy` and `grype` are offered as scanners. A scanner without a report parser logs `<tool> cannot scan for CVEs`.
- If the producer failed, the job logs `<scanner> <FORMAT>: no <producer> <FORMAT> SBOM to scan` and runs nothing.
- Every `cve` job waits for the vulnerability databases to be ready before its first scan.

## 5. Storing results

The worker stores nothing. When the scan API is enabled, the web app's startup hook (`src/instrumentation.ts`) listens for `completed` events on the queue and calls `storeCompletedScan` for each job:

1. If the job returned a result and has no `storedAt` mark, each SBOM is saved with `SBOMService.saveSBOM` and each CVE report with `CVEService.saveCVEFile`.
2. The job data is updated with `storedAt`, so it is never stored twice.
3. Files land at `<image>/<tool>.<format>.json` under `SBOM_DIR` / `CVE_DIR` (or the `sbom/` and `cves/` prefixes in S3), where `<image>` is sanitized: `/` becomes `slash` and `:` becomes `twodots`. For example, `library/nginx:1.27` is stored as `libraryslashnginxtwodots1.27`.

Each tool's results are stored as soon as its job completes, so a slow tool does not hold back the others. At startup, `storeMissedScans` also stores results of jobs that completed while the app was down.

## 6. Trimming Redis

When the parent `scan` job completes, the app rewrites each child's return value (and the parent's copy of it) without the `content` fields. The metadata stays for the status pages; the SBOM bodies, which can be tens of MB, are removed from Redis.

The queue's event stream is capped at 100 entries (`streams.events.maxLen`), because each `completed` event carries the job's full return value.

## Job status

`GET /api/scan/status/[jobId]` returns one status for the whole flow:

```json
{
  "jobId": "...",
  "image": "alpine:3.20",
  "status": "completed",
  "updatedAt": "2026-11-22T10:00:00.000Z",
  "history": [{ "level": "info", "message": "syft is generating SBOMs" }]
}
```

- `status` is the parent job's state: `completed`, `failed`, `running` (active or waiting for children) or `pending` (anything else, such as waiting).
- `history` merges every job's log in the order the jobs ran, plus an `error` entry for any job that failed.
- A scan whose tools all failed still ends as `completed`, with warnings in `history`. Check `history` and the stored files, not only `status`.
- `GET /api/scan/status/recent` returns the 10 most recent scans in the same shape.

## Worker runtime behavior

| Setting | Default | Effect |
|---|---|---|
| `SCAN_CONCURRENCY` | `1` | Jobs a worker runs in parallel. Keep `1`: concurrent `trivy` or `grype` runs contend for the lock on their shared cache. |
| `RUN_EXPERIMENT_TIMEOUT` | `180000` (3 min) | Per-command timeout in ms. A killed command fails with `<cmd> timed out after <n>s: <last stderr>`. |
| `DB_REFRESH_HOURS` | `24` | How often the vulnerability databases are refreshed. |
| `REDIS_HOST` / `REDIS_PORT` | `127.0.0.1` / `6379` | Redis connection, shared with the app. |

Vulnerability databases:

- At startup the worker runs `grype db update`, `trivy image --download-db-only` and `trivy image --download-java-db-only`, each with a 1 hour timeout. A failed update logs an error and the cached copy is used.
- Scans never update a database: grype runs with `GRYPE_DB_AUTO_UPDATE=false`, trivy with `--skip-db-update`.
- Every `DB_REFRESH_HOURS` the worker pauses (waiting for the running job to finish), refreshes the databases, then resumes.
- In the worker image the databases live under `/cache/dbs` (`TRIVY_CACHE_DIR=/cache/dbs/trivy`, `GRYPE_DB_CACHE_DIR=/cache/dbs/grype`), which Compose and Helm mount on a persistent volume.

On `SIGTERM` or `SIGINT` the worker finishes its current jobs before exiting. BullMQ requeues anything left as stalled.

## Related

- [Run live scans](/guides/live-scans)
- [Architecture overview](/architecture/)
