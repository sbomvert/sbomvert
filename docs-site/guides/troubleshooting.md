---
title: Troubleshooting
description: Causes and fixes for common SBOMVert errors and symptoms, from empty comparison pages to stuck scans and S3 permission problems.
---

# Troubleshooting

Each section heading is a symptom or an error message as you would see it. Find yours, check the cause, and apply the fix. Server-side messages appear in the app's console (`npm run dev` output or `kubectl logs`); worker messages appear in the scan worker's log and in the scan's history on the Scan page.

## Data and comparison

### `/compare` shows no images

The image list comes from the sub-folders of the SBOM folder (or the `sbom/` prefix in S3). An empty list means the app is looking somewhere with no data.

1. **Check the backend.** `ARTIFACT_BACKEND_TYPE` must be `local` (or unset) for folders, `s3` for a bucket.
2. **Check the folder.** With `local`, `SBOM_DIR` defaults to `./public/sbom`, relative to the directory the app was started from. A wrong path is created silently and stays empty, so there is no error.
3. **Check the layout.** Each image needs its own folder with files named `<tool>.<format>.json`:

   ```text
   public/sbom/alpinetwodots3.20/syft.spdx.json
   public/sbom/alpinetwodots3.20/trivy.cdx.json
   ```

   Files directly in `SBOM_DIR`, or not ending in `.json`, are ignored.
4. **With S3**, see [S3 access denied or an empty compare page with S3](#s3-access-denied-or-an-empty-compare-page-with-s3).

Restart the app after changing environment variables.

### Images are listed but show 0 CVE reports

CVE reports are read from `CVE_DIR/<same image folder>/`. The code default is `./public/cves` (plural), while the bundled dataset uses `public/cve`. Set `CVE_DIR=public/cve` (or wherever your reports are). In S3 the prefix is `cves/`, not `cve/`.

### The "CVE Comparison" option is missing on `/compare`

It is shown only when `NEXT_PUBLIC_CVE_MAPPING_ENABLED=true`. Set it and restart. Because it is a `NEXT_PUBLIC_` variable used in the browser, a production build must be rebuilt (`npm run build`) after changing it.

### `Invalid JSON payload` when opening an SBOM

`GET /api/sbom/<image>/<file>` returns this when the stored file is not valid JSON. Replace the file with a valid SBOM.

## Uploading, analyzing and translating

### `Not an SPDX or CycloneDX SBOM`

Shown by the upload form, the analysis page and the translate page. The file is valid JSON but SBOMVert does not recognize it. It must be either:

- **SPDX JSON**: a top-level `spdxVersion` string, or
- **CycloneDX JSON**: a top-level `"bomFormat": "CycloneDX"`.

Common causes: an SPDX tag-value or XML file, a CycloneDX XML file, a vulnerability report instead of an SBOM, or an SBOM wrapped in another object (for example an API response). Export the SBOM as SPDX JSON or CycloneDX JSON.

### `The file is not valid JSON` / `Not valid JSON` / `File is not valid JSON.`

The file could not be parsed as JSON. Check that it is not truncated, not XML or tag-value, and not compressed. The first message comes from the translate page, the second from the SBOM upload form, the third from the CVE report upload page.

### `No translator for <tool> <format>`

The translate step has no reader or writer for that tool in that format. Translators exist for:

| Format | Tools |
|---|---|
| SPDX | Syft (`anchore`), Trivy, Docker Scout (`docker`), Google, Amazon, Microsoft |
| CycloneDX | Syft (`anchore`), Trivy, Docker Scout (`docker`), Amazon |

SBOMs from OSV-Scanner or cdxgen, for example, cannot be translated. Pick a source and target from the lists offered on the page. See [Translation limitations](https://github.com/sbomvert/sbomvert/blob/main/TRANSLATION_LIMITATIONS.md).

### `SBOM upload is not enabled`

`POST /api/sbom/upload` returns `403` with this message when `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD` is not `true`. The **Upload SBOM** sidebar entry is also hidden. Set the variable and restart the app.

### `Failed to upload the SBOM: ...`

The upload form shows the API's error after the colon:

| Message | Cause and fix |
|---|---|
| `No file provided` / `Container name is required` | A form field was empty. |
| `Invalid JSON format. Please provide a valid SBOM file` | The file is not JSON. |
| `Unknown SBOM format. Expected SPDX or CycloneDX format` | No `spdxVersion` or `bomFormat` field. |
| `Failed to parse SPDX SBOM` | The SPDX document could not be parsed into packages. |
| `Invalid container or file name` | The container name, tool or format is empty, is `.` or `..`, or contains `/` or `\`, so it could leave the storage folder. Use a plain image name and tool name. |
| `Failed to upload SBOM file` | Writing to storage failed. Check the server log for the underlying error (permissions, S3 access). |

### `Enter the tool that made the SBOM`

The upload form could not detect the tool from the SBOM's metadata. Type the tool name (for example `syft`); it becomes the file name, `<tool>.<format>.json`.

## Live scans

### The Scan page redirects to the home page, or `curl` gets HTML instead of JSON

`/scan` and every `/api/scan/*` route redirect to `/` when `NEXT_PUBLIC_ENABLE_SCAN_API` is not `true` on the server. A script then receives the home page's HTML, and `jq` fails with a parse error. Set the variable for the app (not only the worker) and restart it. It is read at runtime, so a rebuild is not needed.

`{"error":"Scan feature disabled"}` with status `403` has the same cause.

### `Scan queue unavailable`

The app could not reach Redis (`503` on `POST /api/scan` or the status routes). Check that Redis runs and that `REDIS_HOST` and `REDIS_PORT` point to it from the app's point of view (`127.0.0.1` for a local `npm run dev`).

### Scans stay `pending`

The scan is queued but no worker is taking jobs.

1. **Is the worker running?** Start it with `npm run worker:dev`, or check the `<release>-worker` Deployment.
2. **Same Redis?** The worker and the app must use the same `REDIS_HOST` / `REDIS_PORT`. The worker logs `scan worker listening on queue "scan"` when connected.
3. **Busy worker?** With `SCAN_CONCURRENCY=1` a worker runs one job at a time; other scans wait their turn.

### Scans are `running` for a long time after the worker starts

On first start the worker downloads the Grype and Trivy databases (several GiB, up to 1 hour timeout each). CVE jobs and Trivy SBOM jobs wait for it; the scan log shows `grype is waiting for the vulnerability databases` or `trivy is waiting for its databases`. Keep the database volume (`<release>-worker-dbs` in Helm) so later starts reuse the cached copy.

### `<tool> timed out after 180s: ...`

A tool was killed after `RUN_EXPERIMENT_TIMEOUT` milliseconds (default `180000`). The text after the colon is the end of the tool's error output. Large images, slow registries or pulls over a slow network need more time. Raise `RUN_EXPERIMENT_TIMEOUT` in the **worker's** environment, for example `RUN_EXPERIMENT_TIMEOUT=600000`, and restart the worker. The Helm chart does not expose this setting.

### Docker Scout fails: `scout failed: ...`

Docker Scout needs a Docker Hub account. Set `DOCKER_SCOUT_HUB_USER` and `DOCKER_SCOUT_HUB_PASSWORD` (a Docker Hub access token works as the password) in the worker's environment, for example in `.env`, and restart the worker. Without them Scout runs fail and the other tools still run. The Helm chart has no values for these variables.

### Trivy or Grype fail with lock or cache errors

Trivy runs share one cache and Grype runs share one database, each protected by a lock. With `SCAN_CONCURRENCY` above `1`, concurrent runs contend for that lock and can fail or time out. Set `SCAN_CONCURRENCY=1` (the default) and restart the worker.

### `<TOOL> cannot generate <FORMAT> SBOMs: none will be made.` or `no <tool> <FORMAT> SBOM`

The tool does not write that format: `amazon` and `cdxgen` write CycloneDX only, `osv` writes SPDX only. The first message is a warning on the Scan form, the second appears in the scan log. Other tools and formats in the same scan are not affected. If a tool that supports the format logs `no <tool> <FORMAT> SBOM`, look for a preceding `<tool> failed: ...` line with the real error.

### `<tool> cannot produce SBOMs` / `<tool> cannot scan for CVEs`

The tool name is not a known SBOM producer or CVE scanner. Producers are `trivy`, `syft`, `scout`, `amazon`, `osv`, `cdxgen`; scanners are `trivy`, `grype` and `scout`. `GET /api/scan/tools` returns the current list.

### `grype needs a syft SBOM, which was not requested`

Grype scans Syft's SBOM. Add `syft` to the producers, or remove `grype` from the scanners.

### `<scanner> <FORMAT>: no <producer> <FORMAT> SBOM to scan`

The scanner had nothing to scan because its producer failed or did not write that format. Look further up the log for the producer's error.

### `Invalid image reference`

`POST /api/scan` rejects references that start with `-`, contain `..`, use a source scheme (`dir:`, `file:`, `docker-archive:`...), contain characters other than letters, digits and `._/:@-`, or exceed 255 characters. Use a plain registry reference such as `alpine:3.20` or `ghcr.io/org/app@sha256:...`.

### `Select at least one SBOM generator`

`tools.producers` is empty. Choose at least one SBOM generator. CVE scanners are optional: leave them out (`tools.consumers` empty) to generate SBOMs only.

### A scan is `completed` but nothing new appears on `/compare`

- **Every tool failed.** `completed` only means all jobs finished. Expand the scan on the Scan page and read the warnings.
- **The app did not store the results.** Results are saved by the web app, not the worker, when the app receives the job's `completed` event. Look for `Handling completed scan job <id> failed` in the app's log: usually a storage write error (folder permissions, S3 access). Fix the cause and restart the app; it stores missed results at startup.
- **Different storage.** The app that queued the scan and the app you are looking at must use the same backend and folders.

### `Unauthorized` or `Unauthorized: Invalid or expired API key.`

Sign-in is enabled (`NEXT_PUBLIC_ENABLE_AUTH=true`), and every `/api/scan/*` request needs a session or an `x-api-key` header.

- `Unauthorized`: no key was sent and there is no session cookie. Add `-H "x-api-key: <key>"`.
- `Unauthorized: Invalid or expired API key.`: the key is wrong, expired, or over its rate limit of 50 requests per hour (status polls count). Create a new key in **Settings → Security**, or poll less often.

## Authentication

### `/auth/sign-in` or `/settings/...` returns 404

These pages exist only when `NEXT_PUBLIC_ENABLE_AUTH=true`. Set it, along with the variables below, and restart. The flag is a `NEXT_PUBLIC_` variable that client code reads, so rebuild a production build after changing it. In the static build, auth is always off.

### `Authentication is enabled (NEXT_PUBLIC_ENABLE_AUTH) but DATABASE_URL, BETTER_AUTH_SECRET is not set`

Auth needs Postgres and a secret. Locally:

1. Generate a secret with `openssl rand -base64 32`.
2. Add to `.env` (or your environment):

   ```bash
   NEXT_PUBLIC_ENABLE_AUTH=true
   BETTER_AUTH_SECRET=<the generated value>
   BETTER_AUTH_URL=http://localhost:3000
   DATABASE_URL=postgresql://sbomvert:sbomvert@localhost:5432/sbomvert
   ```

3. Start PostgreSQL on `localhost:5432`, with the user, password and database named in `DATABASE_URL`, then restart the app.

4. Create the tables once, from the host:

   ```bash
   DATABASE_URL=postgresql://sbomvert:sbomvert@localhost:5432/sbomvert npx drizzle-kit push
   ```

### `Magic link sign-in needs email sending, which is not configured`

Magic links are only logged to the console in development. In production (`NODE_ENV=production`) they are refused because no email sender is configured. Use GitHub sign-in (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) in production. See [Authentication](/guides/authentication).

## Storage

### S3 access denied or an empty compare page with S3

Listing errors are logged as `Error listing SBOMs from S3:` (or `Error listing CVEs from S3:`) followed by the AWS SDK error, and the UI shows an empty list.

| Error in the log | Cause | Fix |
|---|---|---|
| `NoSuchBucket` | The bucket `sbomvert` does not exist. The name is fixed in code; `S3_BUCKET` does not change it. | Create a bucket named `sbomvert`. |
| `AccessDenied` / `InvalidAccessKeyId` / `SignatureDoesNotMatch` | Wrong credentials, or missing `s3:ListBucket`, `s3:GetObject`, `s3:PutObject`. | Fix the key pair or policy. |
| Credentials ignored | `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` are only used when `S3_ENDPOINT` is set. Without it, the AWS default credential chain is used. | Set `S3_ENDPOINT`, or provide `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or an IAM role. |
| `getaddrinfo ENOTFOUND sbomvert.<host>` | Virtual-hosted URLs: the SDK put the bucket in the hostname, which a self-hosted server does not resolve. | Set `S3_FORCE_PATH_STYLE=true`. |
| `ENOTFOUND <host>` | The endpoint is a name this machine cannot resolve, for example one that exists only inside a cluster. | Use an address this machine can reach, such as `S3_ENDPOINT=http://localhost:8333`. |
| `PermanentRedirect` / `AuthorizationHeaderMalformed` | `AWS_REGION` does not match the bucket's region. | Set `AWS_REGION` to the bucket's region. |

Also check that objects use the expected keys: `sbom/<image>/<tool>.<format>.json` and `cves/<image>/<tool>.<format>.json`. See [Use S3 storage](/guides/s3-storage).

## Static build

### Pages are missing or return 404 on the static site

`npm run build:static` builds only the pages that need no server: the home page, `/compare/analyze`, `/compare/analyze/local` and `/translate`. Comparison of stored data (`/compare`, `/compare/sbom`, `/compare/cve`), upload, scans, sign-in and all API routes are left out by design. Use the server build (`npm run build && npm start`) for those.

### The static site loads without styles or scripts when served under a path

Assets are requested from the site root. Build with the path the site is served under, for example:

```bash
NEXT_PUBLIC_BASE_PATH=/sbomvert/app npm run build:static
```

See [Static build](/guides/static-build).

## Documentation site

### `Host version "x.y.z" does not match binary version "a.b.c"` when running `npm run docs:dev`

esbuild (used by VitePress through Vite) found a native binary for a different version or CPU architecture than its JavaScript package. This typically happens when `docs-site/node_modules` was installed with one Node build and run with another, such as an x64 Node under Rosetta and an arm64 Node on Apple silicon, or when `node_modules` was copied between machines or a container and the host.

Reinstall with the Node you will run it with:

```bash
node -p process.arch        # check: arm64 or x64
rm -rf docs-site/node_modules
npm --prefix docs-site install
npm run docs:dev
```

## Related

- [Run live scans](/guides/live-scans)
- [Use S3 storage](/guides/s3-storage)
- [Authentication](/guides/authentication)
