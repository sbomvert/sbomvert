---
title: Installation
description: Install SBOMVert from source, as a Docker container, with Docker Compose, on Kubernetes with Helm, or as a static site, and configure where it reads reports.
---

# Installation

SBOMVert is a Next.js application. It runs in [three modes](/getting-started/#three-ways-to-run-sbomvert): static (browser only), server, and server with live scans. To only analyze or translate an SBOM, you don't need to install anything: use [sbomvert.jackops.dev](https://sbomvert.jackops.dev).

You can install it in five ways:

| Option | Best for | Live scans |
| --- | --- | --- |
| [From source](#from-source) | Development, trying things out | With Redis and `npm run worker:dev` |
| [Docker container](#docker-container) | Viewing an existing dataset | No (app image only) |
| [Docker Compose](#docker-compose) | A full local stack: app, worker, Redis, S3 | Yes |
| [Helm](#kubernetes-with-helm) | Kubernetes | With `scan.enabled` |
| [Static build](#static-build) | SBOM analysis and translation without a server | No |

## Prerequisites

- **From source:** Node.js 22.10 or later and npm 10 or later (see `.nvmrc` and the `engines` field in `package.json`). [nvm](https://github.com/nvm-sh/nvm) is the easiest way to get the right Node version.
- **Container and Compose:** Docker with Docker Compose.
- **Helm:** a Kubernetes cluster and Helm 3.8 or later (for OCI charts).

## From source

1. Clone the repository and enter it:

   ```bash
   git clone https://github.com/sbomvert/sbomvert.git
   cd sbomvert
   ```

2. Install and select the pinned Node version:

   ```bash
   nvm install
   nvm use
   ```

3. Install dependencies. The repository is an npm workspaces project, so this also links `packages/core`, `packages/scan`, `packages/storage` and `worker/`:

   ```bash
   npm install
   ```

4. Tell the app where your reports are. Create `.env.local` in the repository root:

   ```bash
   ARTIFACT_BACKEND_TYPE=local
   SBOM_DIR=public/sbom
   CVE_DIR=public/cve
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   NEXT_PUBLIC_CVE_MAPPING_ENABLED=true
   ```

   Then copy your data (for example the [sample dataset](https://box.roc.cnam.fr/index.php/s/XQRa9dXz7bpWGRf)) so that `public/sbom/` and `public/cve/` exist. Both folders are ignored by git.

5. Start the development server:

   ```bash
   npm run dev
   ```

   **Expected result:** the app runs at [http://localhost:3000](http://localhost:3000), and [http://localhost:3000/compare](http://localhost:3000/compare) lists your images.

For a production build, run `npm run build` and then `npm start`.

::: tip Live scans from source
Live scans also need Redis and the scan worker. With Redis running (`REDIS_HOST` and `REDIS_PORT` default to `127.0.0.1:6379`) and `NEXT_PUBLIC_ENABLE_SCAN_API=true`, start the worker in a second terminal with `npm run worker:dev`. The worker runs the SBOM and CVE tools, so they must be installed where it runs; Docker Compose does this for you. See [Live scans](/guides/live-scans).
:::

## Docker container

The release workflow publishes the app image as `ghcr.io/sbomvert/sbomvert` (tags `latest` and the release version), for `linux/amd64` and `linux/arm64`. It is built from the repository's `Dockerfile`: a Next.js standalone server that runs as the `node` user on port 3000. The image contains no dataset.

Mount your report folders and point the app at them:

```bash
docker run --rm -p 3000:3000 \
  -e ARTIFACT_BACKEND_TYPE=local \
  -e SBOM_DIR=/app/public/sbom \
  -e CVE_DIR=/app/public/cve \
  -e NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
  -v "$PWD/sbomvert-data/sbom:/app/public/sbom" \
  -v "$PWD/sbomvert-data/cve:/app/public/cve" \
  ghcr.io/sbomvert/sbomvert:latest
```

::: warning Mount a volume
Without `-v`, anything the app writes (uploaded SBOMs, scan results) is stored inside the container and lost when it exits.
:::

::: warning Flags read at build time
Next.js copies `NEXT_PUBLIC_*` values into the browser code when the app is built. In the prebuilt image, the values used by browser code, such as the **Upload SBOM** sidebar entry (`NEXT_PUBLIC_ENABLE_SBOM_UPLOAD`) and the **CVE Comparison** button on `/compare` (`NEXT_PUBLIC_CVE_MAPPING_ENABLED`), are fixed when the image is built; setting them with `-e` may not change the UI. `NEXT_PUBLIC_ENABLE_SCAN_API` is the exception: the app reads it from the running environment. To change the others, build your own image with the values set at build time. The **CVE Comparison** sidebar entry is always available, whatever the flag.
:::

## Docker Compose

The repository's `docker-compose.yml` runs a complete development stack with every feature on. Its settings are in `.env.dev`.

| Service | What it runs |
| --- | --- |
| `nextjs` | The app in development mode (`Dockerfile.dev`, `npm run dev`), with the repository mounted at `/app`. Port 3000. |
| `scan-worker` | The scan worker (`worker/Dockerfile`) that runs the SBOM and CVE tools for queued scans. |
| `redis` | Redis 7, the job queue for scans. Port 6379. |
| `seaweedfs` | SeaweedFS as an S3-compatible store. S3 API on port 8333. |
| `seaweedfs-init` | One-shot job that creates the `sbomvert` bucket. |
| `postgres` | PostgreSQL, only with `--profile auth`, for [authentication](/guides/authentication). |

1. Create the volume for the vulnerability databases, once:

   ```bash
   docker volume create sbomvert-scan-dbs
   ```

   The worker keeps the Grype and Trivy databases (several GiB) in this volume. Because you create it, and not Compose, `docker compose down -v` leaves it in place and the databases are not downloaded again.

2. Start the stack from the repository root:

   ```bash
   docker compose up
   ```

   **Expected result:** the app at [http://localhost:3000](http://localhost:3000), with **Scan** and **Upload SBOM** in the sidebar.

`.env.dev` uses local storage (`ARTIFACT_BACKEND_TYPE=local`, `SBOM_DIR=public/sbom`, `CVE_DIR=public/cve`), so the app reads `public/sbom` and `public/cve` from your checkout. SeaweedFS runs either way, but the app only uses it when you set `ARTIFACT_BACKEND_TYPE=s3`; the bucket starts empty. See [S3 storage](/guides/s3-storage).

::: danger Development credentials
`.env.dev` contains development-only S3 credentials. Do not reuse it for a deployment that others can reach.
:::

## Kubernetes with Helm

The Helm chart deploys the app, Redis and SeaweedFS, and the scan worker when `scan.enabled=true`:

```bash
helm install sbomvert oci://ghcr.io/sbomvert/charts/sbomvert --version <version>
```

The chart defaults to S3 storage on the bundled SeaweedFS, and its S3 secret defaults to `change-me`: change it. See [Kubernetes](/guides/kubernetes) for values, access and external S3.

## Static build

SBOM Analysis and Translate SBOM also work as a static site with no server:

```bash
npm run build:static   # writes the site to out/
```

Comparison, upload, scans and sign-in are left out. See [Static build](/guides/static-build).

## Configuration basics

SBOMVert is configured with environment variables. The ones you need first:

| Variable | Purpose | Default |
| --- | --- | --- |
| `ARTIFACT_BACKEND_TYPE` | `local` (folders) or `s3` | `local` |
| `SBOM_DIR` | Folder of SBOMs, local storage | `./public/sbom` |
| `CVE_DIR` | Folder of CVE reports, local storage | `./public/cves` |
| `NEXT_PUBLIC_BASE_URL` | The app's own URL, used by the server to load a stored SBOM on the analysis page | none |
| `NEXT_PUBLIC_CVE_MAPPING_ENABLED` | Shows the CVE Comparison choice on `/compare` | off |
| `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD` | Enables the Upload SBOM page and API | off |
| `NEXT_PUBLIC_ENABLE_SCAN_API` | Enables live scans (needs Redis and the worker) | off |

Feature flags are on only when set to the string `true`. The full list, including S3, Redis, worker and authentication settings, is in [Environment variables](https://github.com/sbomvert/sbomvert#environment-variables).

## Related

- [Quickstart](/getting-started/quickstart)
- [Kubernetes](/guides/kubernetes)
- [Live scans](/guides/live-scans)
- [Static build](/guides/static-build)
