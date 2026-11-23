---
title: Security model
description: SBOMVert's components, trust boundaries, what is and is not authenticated, how untrusted input is handled, and the risks that remain.
---

# Security model

This page describes how SBOMVert is put together from a security point of view: which components trust each other, which requests are authenticated, how untrusted input is handled, and which risks remain. Everything here comes from the code in this repository. Where the code has no protection for something, the page says so.

For a step-by-step production checklist, see [Hardening](/security/hardening).

## Deployment modes

How exposed SBOMVert is depends on how you run it:

| Mode | What runs | Exposure |
| --- | --- | --- |
| **Static build** | HTML and JavaScript only (`npm run build:static`) | No server code. SBOMs never leave the browser. |
| **App, defaults** | Next.js app reading a local folder or S3 | Public read-only API over the stored dataset. |
| **App + upload** | `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD=true` | Anyone who can reach the app can write SBOMs to storage. |
| **App + live scans** | `NEXT_PUBLIC_ENABLE_SCAN_API=true`, Redis and the scan worker | Requests make the worker pull and analyze arbitrary container images. |
| **App + live scans + auth** | Also `NEXT_PUBLIC_ENABLE_AUTH=true` and Postgres | Scan API limited to signed-in users and API keys. |

All three feature flags are off by default (`src/lib/featureFlags.ts`).

## Components and trust boundaries

```text
                       ┌─────────────────────────── untrusted ───────────────────────────┐
                       │  browser / API client          container registries, vuln DB    │
                       └───────┬─────────────────────────────────────▲──────────────────┘
                               │ HTTP(S)                              │ HTTPS (pull images,
                     ══════════╪══════════ boundary 1 ═════           │  download databases)
                               ▼                                      │
   ┌─────────────┐     ┌───────────────┐   jobs / results   ┌────────┴──────┐
   │  Postgres   │◄────┤  Next.js app  │◄──────────────────►│     Redis     │
   │ (auth only) │     │ proxy + API   │                    │ (BullMQ queue)│
   └─────────────┘     └──────┬────────┘                    └────────▲──────┘
                              │ read / write                         │ jobs / results
                              ▼                                      │
                       ┌───────────────┐                    ┌────────┴──────┐
                       │   storage     │                    │  scan worker  │
                       │ folder or S3  │                    │ syft, trivy,  │
                       │ (SeaweedFS)   │                    │ grype, ...    │
                       └───────────────┘                    └───────────────┘
                     ══════════════════ boundary 2: internal network ══════════════════
```

**Boundary 1: clients and the app.** Everything a browser or API client sends is untrusted: request bodies, uploaded files, image references, and path segments of `/api/sbom/<image>/<file>`.

**Boundary 2: the internal network.** The app, Redis, the worker, storage and Postgres trust each other. Nothing in the code authenticates traffic between them except storage credentials and the Postgres connection string:

- **Redis.** The app and the worker connect with only `REDIS_HOST` and `REDIS_PORT` (`redisConnection` in `packages/scan/src/queue.ts`). There is no setting for a Redis password or TLS. Anyone who can reach Redis can read and change jobs and their results.
- **Storage.** The app uses S3 credentials (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) or a local folder.
- **Postgres.** Accessed only through `DATABASE_URL`, and only when authentication is on.

**Outbound traffic from the worker.** The scanner tools pull images directly from registries, and the worker downloads Grype and Trivy databases. The worker container has no Docker daemon and no Docker socket.

## Authentication

Authentication is optional and protects the **scan API only**. See [Authentication and API keys](/guides/authentication) for setup.

| Surface | Auth off | Auth on |
| --- | --- | --- |
| `GET /api/sbom/*`, `GET /api/sbom-files`, `GET /api/cve*` | Public | **Public** |
| `POST /api/sbom/upload` (flag on) | Public | **Public** |
| `/api/scan` and everything under it (flag on) | Public | Session cookie or `x-api-key` |
| `/settings/*` | 404 | Session |
| `/compare/*`, `/translate`, home | Public | Public |

How it is enforced:

- **Proxy.** `src/proxy.tsx` runs on `/scan` and `/api/scan/:path*`. It redirects to `/` when the scan API is off. When auth is on, it requires a valid session or API key for paths under `/api/scan`.
- **Route.** `POST /api/scan` checks again in its handler (`authorizeScanRequest` in `src/lib/auth/scan-auth.ts`), so it stays protected if the proxy is bypassed or misconfigured.
- **API keys** are verified by Better Auth, stored hashed, and rate-limited to 50 requests per hour per key.

What authentication does **not** provide:

- **No authorization levels.** There are no roles, and any signed-in user can do everything the scan API offers.
- **No sign-up restriction.** Any GitHub account can sign in.
- **No per-user isolation.** Any signed-in user can read the status of any job by ID, and `GET /api/scan/status/recent` lists scans from all users.
- **No rate limit for browser sessions.** The 50 requests per hour apply to API keys only.
- **No working email.** Magic links are only logged in development and refused in production.

## Untrusted input

### Image references

An image reference from `POST /api/scan` ends up as a command-line argument to the scanner tools. It is validated twice: by the route's schema, and again by the worker, because job data comes through Redis (`isValidImageRef` in `packages/scan/src/image.ts`). A valid reference:

- is at most 255 characters;
- contains only letters, digits and `. _ / : @ -`, and starts with a letter or digit, so it cannot start with `-` and become a flag;
- contains no `..`;
- has no source scheme such as `dir:/`, `file:`, `oci-dir:` or `docker-archive:`, so the tools cannot be pointed at the worker's own filesystem.

The worker runs tools with `execFile`, without a shell, so arguments are not interpreted by a shell (`runCommand` in `worker/src/processScan.ts`). Tool names are only used to pick a command from a fixed `switch`, so an unknown name produces no command. Formats are checked against `spdx` and `cdx`. Duplicate tools in a request are merged before jobs are created.

::: warning Internal registries are reachable
A reference may name any `host:port`, including private IP addresses. The worker will try to pull from whatever host the reference names, as far as its network allows. Restrict the worker's outbound network if internal registries or services must not be reachable (see [Hardening](/security/hardening)).
:::

### Uploaded SBOMs

`POST /api/sbom/upload` works only with `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD=true`. Commit `e279b2c` ("safer parsing of artifacts") added the path checks below. The route:

1. Parses the file as JSON and rejects it unless it looks like SPDX (`spdxVersion`) or CycloneDX (`bomFormat`). An SPDX file that the SPDX parser cannot read is rejected. A CycloneDX file that fails to parse is still accepted.
2. Requires the container name, tool and format to each be a single safe path segment: not empty, not `.` or `..`, and containing no `/`, `\` or NUL (`isSafeName` in `packages/storage/src/safePath.ts`). Otherwise it returns `400`.
3. Stores the file content **as uploaded**, not a re-serialized copy.

The local storage backend applies the same check when reading. `GET /api/sbom/<image>/<file>` and `GET /api/cve/<image>/<file>` reject names that could leave `SBOM_DIR` or `CVE_DIR`. Writes go through `pathIn`, which throws on such names.

Not covered:

- **Size.** The upload route sets no size limit of its own.
- **S3 reads.** The S3 backend builds the object key as `<prefix><image>/<file>` without the safe-name check.
- **Authentication.** The upload route does not check for a session.

### Scan results

The worker returns SBOMs and CVE reports as job results through Redis, and the app writes them to storage (`src/services/scanResults.ts`). The image name is sanitized for storage (`/` → `slash`, `:` → `twodots`). Local writes are path-checked as above. The worker checks that each SBOM is valid JSON, and stores CVE reports only in the normalized form (see [Vulnerabilities](/concepts/vulnerabilities#the-normalized-report)).

Job logs are returned by the status endpoints. They can include tool error messages, such as registry errors for a reference that could not be pulled.

### Rendering

The UI renders SBOM content through React, which escapes text. The `src/` code does not use `dangerouslySetInnerHTML`. The app sets no Content-Security-Policy or other security headers of its own; `poweredByHeader` is disabled.

## The scan worker

The worker (`worker/`) runs third-party tools on **untrusted images**: Syft, Trivy, Grype, Docker Scout, Amazon Inspector SBOM Generator, OSV-Scanner and cdxgen. Those tools parse image layers and package metadata chosen by whoever submitted the scan. A parser bug in any of them runs inside the worker.

Present in the code:

- **No Docker daemon or socket.** The tools pull images over the registry API (`docker-cli` is installed only for the Scout plugin). OSV-Scanner and cdxgen read an image that `skopeo` downloads to a temporary directory.
- **No service account token** in Kubernetes (`automountServiceAccountToken: false` in the chart).
- **No storage credentials.** The worker only needs Redis; the app stores the results.
- **Timeouts.** Each tool run is limited by `RUN_EXPERIMENT_TIMEOUT` (180 s by default), and tool output is capped at 50 MB.
- **Temporary files** are created per run and deleted afterwards.
- **No database downloads during scans.** Scans run with automatic database updates disabled. The worker refreshes the Grype and Trivy databases itself, at startup and then between jobs every `DB_REFRESH_HOURS`.

Not present:

- The worker image runs as **root** (`worker/Dockerfile` has no `USER`).
- The chart sets no `securityContext`, resource limits or `NetworkPolicy` for the worker.
- The only secrets the worker can hold are `DOCKER_SCOUT_HUB_USER` and `DOCKER_SCOUT_HUB_PASSWORD`, if you set them. A compromised worker can read them.

## Static build privacy

The static build (`npm run build:static`) contains only the home, analysis and translation pages, with `output: 'export'`. There is no server code. An SBOM you open, upload or paste is parsed and translated by JavaScript in your browser, and is never sent anywhere. The comparison, upload, scan and sign-in features are not part of the build.

In the full app, the analysis and translation pages also process local files in the browser. Only the separate upload page sends a file to the server, and only when upload is enabled.

## Secrets

All secrets are environment variables:

| Secret | Used by |
| --- | --- |
| `BETTER_AUTH_SECRET` | App: signs sessions and tokens |
| `DATABASE_URL` (includes the Postgres password) | App, `drizzle-kit` |
| `GITHUB_CLIENT_SECRET` | App: GitHub OAuth |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | App, SeaweedFS |
| `DOCKER_SCOUT_HUB_USER`, `DOCKER_SCOUT_HUB_PASSWORD` | Worker: Docker Scout |

- **Helm.** The chart puts the S3 key pair in a Kubernetes `Secret` (`<release>-s3`) and passes it to the app and SeaweedFS with `secretKeyRef`. The values come from `values.yaml`, whose default secret key is `change-me`. The chart has no settings for the authentication or Docker Scout secrets.
- **Compose.** `.env.dev` is committed and holds **development** credentials, including the SeaweedFS key pair. Do not reuse it outside local development.
- `.env`, `.env.local` and `.env.*.local` are git-ignored.

## Supply chain

The repository's own practices, as configured in `.github/` and the Dockerfiles:

- **GitHub Actions pinned by commit SHA**, with the version in a comment. Dependabot updates both.
- **Dependabot** checks npm (root and `docs-site`), GitHub Actions, the Dockerfiles' base images, Compose images and the Helm chart every week. Scanner versions in `worker/Dockerfile` are deliberately left out and bumped by hand, because they change scan results.
- **CodeQL** runs in CI. `npm audit` runs too, but only prints its results and never fails the build.
- **Lockfile installs.** Both images install npm dependencies with `npm ci`.
- **App image** runs as the non-root `node` user.
- **Worker tool downloads**, pinned by version build arguments:
  - Syft, Grype and Trivy are installed with each project's install script, fetched from the same release tag as the binary.
  - cdxgen is checked against its published SHA-256.
  - OSV-Scanner (despite a comment in the Dockerfile saying otherwise) and Amazon Inspector SBOM Generator are downloaded with no checksum check.
  - The Docker Scout plugin is installed with the install script from the `main` branch, so it is not pinned.
- **Release images** are pushed with both the version tag and `latest`, and the chart's `values.yaml` defaults to `latest`.

## Threat model

| Threat | Mitigation present | Residual risk |
| --- | --- | --- |
| Unauthenticated users run scans and use your compute and bandwidth | Scan API off by default. With auth on, a session or API key is required. API keys are rate-limited. | Any GitHub user can sign in. Sessions are not rate-limited. No limit on queued jobs. |
| Command or flag injection through the image reference | Strict validation in the route and the worker. `execFile` without a shell. Fixed tool commands. | Low. |
| Tool reads the worker's own files (`dir:/`, `file:`) | Source schemes rejected by `isValidImageRef`. | Low. |
| Pulls from internal registries or probing internal hosts via image references | None in the code. | Depends on the worker's network. Error messages come back in job logs. |
| Malicious image exploits a scanner parser | Worker isolated from storage credentials and the Docker daemon. No Kubernetes token. Timeouts. | Worker runs as root, with no securityContext or NetworkPolicy in the chart. Results it returns are trusted by the app. |
| Path traversal through API path segments or uploads | `isSafeName` and `pathIn` on the local backend. | S3 reads are not name-checked. |
| Anyone writes or overwrites stored SBOMs | Upload is off by default. | When upload is on, it needs no authentication, and an upload replaces an existing file with the same image, tool and format. |
| Large uploads or scan outputs exhaust memory or disk | Tool output capped at 50 MB. Redis keeps the last 500 jobs. SBOM contents are removed from Redis once stored. | No upload size limit in the route. No storage quotas. |
| Tampering with jobs or results through Redis | Worker re-validates image and formats from job data. | No Redis authentication. Anyone with network access to Redis can change jobs or results. |
| Reading another user's scans | None. | All signed-in users see all jobs. |
| Session or API key theft | Keys stored hashed and can expire (7 to 90 days, or never). Rate limit per key. | The app sets no security headers. TLS is up to your reverse proxy. |
| Magic links leak through logs | Links are logged only in development and refused in production. | Development logs contain working sign-in links. |
| Compromised third-party tool download | Version pins. Checksum for cdxgen. Install scripts from release tags. | OSV-Scanner, Inspector and Scout are not verified. Scout is not pinned. |
| Leaked default credentials | Helm keeps S3 credentials in a Secret. | Defaults (`change-me`, the `.env.dev` pair) work if you do not change them. |
| Private SBOM content sent to a server | Static build has no server. Analysis and translation run in the browser. | None for the static build. |

The older review in `docs/security/2026-10-14-scan-pipeline-security-review.md` covers an earlier scan design that was not merged. Its file references do not match the current code. Its checklist (limits, network isolation, Redis credentials) still applies to the current worker.

## Related

- [Hardening checklist](/security/hardening)
- [Authentication and API keys](/guides/authentication)
- [Scan pipeline](/architecture/scan-pipeline)
- [Storage](/architecture/storage)
- [Static build](/guides/static-build)
