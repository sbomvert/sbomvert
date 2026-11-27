---
title: Installation
description: Install SBOMVert from source, on Kubernetes with Helm, or as a static site, and configure where it reads reports.
---

# Installation

SBOMVert is a Next.js application. It runs in [three modes](/getting-started/#three-ways-to-run-sbomvert): static (browser only), server, and server with live scans. To only analyze or translate an SBOM, you don't need to install anything: use [sbomvert.jackops.dev](https://sbomvert.jackops.dev).

You can install it in three ways:

| Option | Best for | Live scans |
| --- | --- | --- |
| [From source](#from-source) | Development, trying things out | With Redis and `npm run worker:dev` |
| [Helm](#kubernetes-with-helm) | Kubernetes | With `scan.enabled` |
| [Static build](#static-build) | SBOM analysis and translation without a server | No |

## Prerequisites

- **From source:** Node.js 22.10 or later and npm 10 or later (see `.nvmrc` and the `engines` field in `package.json`). [nvm](https://github.com/nvm-sh/nvm) is the easiest way to get the right Node version.
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
Live scans also need Redis and the scan worker. With Redis running (`REDIS_HOST` and `REDIS_PORT` default to `127.0.0.1:6379`) and `NEXT_PUBLIC_ENABLE_SCAN_API=true`, start the worker in a second terminal with `npm run worker:dev`. The worker runs the SBOM and CVE tools, so they must be installed on the machine where it runs. See [Live scans](/guides/live-scans).
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
| `CVE_RAW_DIR` | Folder of the scanners' raw output from live scans, local storage | `./public/cve-raw` |
| `CVE_RAW_PREFIX` | Prefix of the scanners' raw output from live scans, S3 storage | `cve-raw/` |
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
