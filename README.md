# SBOMVert 

SBOMVert is web app for comparing SBOM (Software Bill of Materials) and CVE reports across different tools.

Read the associated research: [https://arxiv.org/abs/2510.05798](https://arxiv.org/abs/2510.05798).

## Features

- 🔄 Multi-tool SBOM comparison (Syft, Trivy, Docker Scout)
- 📊 Interactive visualizations and charts
- 🔍 Package-level analysis with pURL parsing
- 🕷 CVE comparison package by package

## Prerequisites

- Node.js >= 22 (managed via nvm)
- npm >= 10.0.0

## Setup

### 1. Install Node.js version

```bash
nvm install
nvm use
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Live scans (`NEXT_PUBLIC_ENABLE_SCAN_API`) also need Redis and the scan worker, which runs
syft, trivy, grype and Docker Scout:

```bash
npm run worker:dev
```

Or run everything (app, worker, Redis, SeaweedFS as S3) with Docker Compose; settings are in
[`.env.dev`](.env.dev). The scan worker keeps its vulnerability databases (several GiB) on an
external volume, so they survive `docker compose down -v`; create it once:

```bash
docker volume create sbomvert-scan-dbs
docker compose up
```

### S3 storage with SeaweedFS

Compose runs [SeaweedFS](https://github.com/seaweedfs/seaweedfs) as the S3 server. It reads its access key and secret from `.env.dev`
(`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`), the same pair the app uses, and a `seaweedfs-init` service creates the `sbomvert` bucket.

**The app only uses SeaweedFS when `ARTIFACT_BACKEND_TYPE=s3`.**

For Kubernetes, the Helm chart deploys SeaweedFS the same way, with the credentials in a Secret:
see [charts/README.md](charts/README.md).

## Repository layout

An npm workspaces repo:

| Path | Package | What it is |
|---|---|---|
| `/` | `sbom-comparator` | The Next.js app. It queues scans and shows results. |
| `worker/` | `@sbomvert/scan-worker` | The scan worker: takes jobs from the BullMQ `scan` queue, runs the SBOM and CVE tools, and returns the results as the job's return value. It stores nothing: the web app saves the results as each job completes. Own image (`worker/Dockerfile`); no Docker daemon, since the tools pull images from their registries. Only the vulnerability databases are cached. |
| `packages/core/` | `@sbomvert/core` | Code both use: tool commands, report parsers, SBOM/CVE storage, the scan queue. Consumed as TypeScript source (`@sbomvert/core/<module>`). |

`npm install` at the root installs and links all of them.

## Environment Variables

Here is a (non comprehensive) lilst of environment variables:

```bash


NODE_ENV='development'

ARTIFACT_BACKEND_TYPE='local'
SBOM_DIR='public/sbom'
CVE_DIR='public/cve'

##### S3 configuration #####
# ARTIFACT_BACKEND_TYPE='s3'
# S3_BUCKET=sbomvert
# S3_PREFIX=artifacts/
# S3_ENDPOINT=https://mys3.com
# S3_FORCE_PATH_STYLE=true
# S3_ACCESS_KEY_ID=KEY_ID
# S3_SECRET_ACCESS_KEY=ACCES_KEY
# AWS_REGION=us-east-1

##### Local artifact storage #####
# ARTIFACT_ROOT=./public

NEXT_PUBLIC_BASE_URL='http://localhost:3000'
NEXT_PUBLIC_ENABLE_SBOM_UPLOAD='false'
NEXT_PUBLIC_CVE_MAPPING_ENABLED='true'

##### Authentication (optional) #####
# Off by default. On: sign-in (GitHub, magic link), account settings, and POST /api/scan needs a
# session or an x-api-key. Needs Postgres: `docker compose --profile auth up`, then create the
# tables once with `npx drizzle-kit push`.
#NEXT_PUBLIC_ENABLE_AUTH='true'
#BETTER_AUTH_SECRET=            # openssl rand -base64 32
#BETTER_AUTH_URL=http://localhost:3000
#POSTGRES_USER=sbomvert
#POSTGRES_PASSWORD=sbomvert
#POSTGRES_DB=sbomvert
#DATABASE_URL=postgresql://sbomvert:sbomvert@localhost:5432/sbomvert
#GITHUB_CLIENT_ID=              # GitHub OAuth app, callback http://localhost:3000/api/auth/callback/github
#GITHUB_CLIENT_SECRET=

##### Scan API (experimental) #####
#NEXT_PUBLIC_ENABLE_SCAN_API='true'
#REDIS_HOST=127.0.0.1
#REDIS_PORT=6379
#SCAN_CONCURRENCY=1            # worker: scans run in parallel (keep 1: trivy/grype share a cache lock)
#RUN_EXPERIMENT_TIMEOUT=180000  # worker: per tool run, in ms
#DB_REFRESH_HOURS=24            # worker: grype/trivy databases are downloaded at startup and refreshed this often, between jobs
#DOCKER_SCOUT_HUB_USER=         # worker: Docker Hub account for Docker Scout
#DOCKER_SCOUT_HUB_PASSWORD=


```

## Available Scripts

- `npm run dev` - Start development server
- `npm run worker` / `npm run worker:dev` - Start the scan worker (`:dev` reloads on change)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build Storybook
- `npm run format` - Format code with Prettier

## Add you own SBOMs and CVE reports

The format and location of the SBOMs and CVE reports are as follows:

- `sbom/<container_name>/tool.spdx.json`
- `cve/<container_name>/tool.spdx.json`

## Dataset

A sample dataset for the app is available [here](https://box.roc.cnam.fr/index.php/s/XQRa9dXz7bpWGRf)

### Replicating the dataset

Use these variables: 

```bash
ARTIFACT_BACKEND_TYPE='local'
SBOM_DIR='public/sbom'
CVE_DIR='public/cve'
NEXT_PUBLIC_CVE_MAPPING_ENABLED='true'
```

Then copy the content of the zip file under `public` and then run `npm run dev`.
Everything should be visible under `localhost:3000/compare`
## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Deployment

### Build for production

```bash
npm run build
```

## License

Apache 2.0

## Acknowledgements

This project is sponsored by [NLnet](https://nlnet.nl).

[![NLnet logo](https://nlnet.nl/logo/banner.svg)](https://nlnet.nl)

