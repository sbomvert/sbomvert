---
title: Run live scans
description: Enable the experimental scan feature, start Redis and the scan worker, and generate SBOMs and CVE reports for any image from the Scan page.
---

# Run live scans

Live scans generate SBOMs and CVE reports for a container image on demand, instead of reading a pre-generated dataset. They are experimental and off by default. This guide enables them, runs a scan from the UI, and shows where the results appear.

## What you need

| Piece | Why |
|---|---|
| `NEXT_PUBLIC_ENABLE_SCAN_API=true` | Turns on the `/scan` page and the `/api/scan/*` routes. |
| Redis | Holds the BullMQ `scan` queue shared by the app and the worker. |
| The scan worker | Runs the SBOM tools (Syft, Trivy, Docker Scout, Amazon Inspector SBOM Generator, OSV-Scanner, cdxgen) and the CVE scanners (Trivy, Grype, Docker Scout). |
| Disk for vulnerability databases | Grype's and Trivy's databases take several GiB. |
| Network access to registries | The tools pull images directly from their registries. There is no Docker daemon. |

The worker does not need access to storage. The web app saves the results.

## Run the worker and Redis

The worker runs the SBOM and CVE tools, so they must be installed on the machine where it runs.

1. **Install the tools on your `PATH`:** `syft`, `grype`, `trivy`, `docker` with the Scout CLI plugin (for `scout`), `inspector-sbomgen` (for `amazon`), `osv-scanner` and `skopeo` (for `osv`), `cdxgen` and `skopeo` (for `cdxgen`). Only the tools you select in a scan need to be present.

2. **Start Redis** on port 6379, with any Redis 7 server.

3. **Configure the app** in `.env.local` (or your shell):

   ```bash
   NEXT_PUBLIC_ENABLE_SCAN_API=true
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   ```

4. **Start the app and the worker** in two terminals:

   ::: code-group

   ```bash [app]
   npm run dev
   ```

   ```bash [worker]
   npm run worker:dev   # reloads on change; `npm run worker` without reload
   ```

   :::

   The worker reads `REDIS_HOST`, `REDIS_PORT`, `SCAN_CONCURRENCY`, `RUN_EXPERIMENT_TIMEOUT`, `DB_REFRESH_HOURS` and the `DOCKER_SCOUT_HUB_*` variables from its environment.

::: tip Kubernetes
On Kubernetes, set `scan.enabled: true` in the Helm values. See [Deploy on Kubernetes](/guides/kubernetes).
:::

## Run a scan from the UI

1. **Open the Scan page.** The sidebar shows **Scan** when the flag is on, or go to `/scan`. With the flag off, `/scan` redirects to the home page.
2. **Enter the image** in the **Image** field, for example `alpine:3.20` or `ghcr.io/org/app:1.0`. Use a reference a registry can resolve: the tools pull it themselves.
3. **Choose SBOM generators.** All are selected by default except `SCOUT` (Docker Scout), which you select yourself: `TRIVY`, `SYFT`, `AMAZON`, `OSV`, `CDXGEN`. Click a button to toggle it. At least one is required.
4. **Choose SBOM formats:** `SPDX`, `CycloneDX`, or both. At least one is required.
5. **Choose CVE scanners:** `TRIVY` and `GRYPE` are selected by default. Trivy scans Trivy's SBOM. Grype scans Syft's SBOM, so Grype needs `SYFT` selected. Docker Scout scans Scout's SBOM, so it needs `SCOUT` selected. Deselect them all for an SBOM-only scan: the SBOMs are generated, and no CVE report is.
6. **Read the warning box, if any.** It lists combinations that will produce nothing, such as `AMAZON cannot generate SPDX SBOMs: none will be made.`
7. **Click Start Scan.** The request is sent to `POST /api/scan`. On error, the browser shows an alert with the message from the API (for example `Invalid image reference`).

## Follow progress

The **Recent Scans** list under the form refreshes every 5 seconds from `GET /api/scan/status/recent` and shows the 10 newest scans. Each entry shows the image, the job id and a status:

| Status | Meaning |
|---|---|
| `pending` | Queued; no worker has picked it up yet. |
| `running` | Tools are running, or the parent job is waiting for them. |
| `completed` | All jobs finished. Individual tools may still have failed. |
| `failed` | The scan itself was rejected by the worker (for example invalid job data). |

Click an entry to expand its log. Each line is an `info`, `warning` or `error` message from a job, for example `syft is generating SBOMs`, `syft SPDX SBOM generated`, `grype is waiting for the vulnerability databases`, `grype CDX CVE report generated`.

::: warning `completed` does not mean every tool succeeded
A tool that fails, times out or cannot produce a format is logged as a `warning` and the scan continues. Read the log to see what was produced.
:::

## Where results appear

As each tool finishes, the web app saves its output:

- SBOMs: `<SBOM_DIR>/<image>/<tool>.<format>.json`, or `sbom/<image>/...` in the `sbomvert` S3 bucket.
- CVE reports: `<CVE_DIR>/<image>/<tool>.<format>.json`, or `cves/<image>/...` in S3.
- The scanner's raw output, before SBOMVert normalizes it: `<CVE_RAW_DIR>/<image>/<tool>.<format>.json`, or `cve-raw/<image>/...` in S3 (`CVE_RAW_PREFIX` changes the S3 prefix).

`<image>` is the sanitized name (`alpine:3.20` becomes `alpinetwodots3.20`). The image then shows up on `/compare`, where you can compare its SBOMs and CVE reports like any other. If the app was down when a job finished, it stores the result on its next start.

## Limits

- **Formats per tool.** `amazon` and `cdxgen` write CycloneDX only. `osv` writes SPDX only. Requesting the other format yields `no <tool> <FORMAT> SBOM` in the log.
- **Scanners.** Trivy, Grype and Docker Scout scan for CVEs. Without Docker Hub credentials the Scout steps log a warning, and the other scanners still finish.
- **Scanner inputs.** A scanner without its producer gets no job; the log says `grype needs a syft SBOM, which was not requested`.
- **Docker Scout** needs `DOCKER_SCOUT_HUB_USER` and `DOCKER_SCOUT_HUB_PASSWORD` in the worker's environment.
- **Timeouts.** Each tool command is killed after `RUN_EXPERIMENT_TIMEOUT` ms (default 180000). Large images may need more.
- **Concurrency.** Keep `SCAN_CONCURRENCY=1`: Trivy and Grype runs share a cache lock.
- **Private registries.** SBOMVert has no setting for registry credentials.
- **History.** Redis keeps the last 500 completed and 500 failed jobs for the status views.

## Related

- [Scan pipeline](/architecture/scan-pipeline)
- [Troubleshooting](/guides/troubleshooting)
- [Compare SBOMs](/guides/compare-sboms)
