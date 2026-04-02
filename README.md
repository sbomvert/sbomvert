# SBOMVert 

SBOMVert is web app for comparing SBOM (Software Bill of Materials) and CVE reports across different tools.

> [!CAUTION]
> The tool is under active development and is intended for educational purposes

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

## Environment Variables

Here is a (non comprehensive) lilst of environment variables:

```bash


NODE_ENV='development'

ARTIFACT_BACKEND_TYPE='local'
SBOM_DIR='public/sbom'
CVE_DIR='public/cve'

##### S3 configuration #####
# ARTIFACT_BACKEND_TYPE='s3'
# SBOM_S3_BUCKET=sbom-files
# S3_ENDPOINT=https://mys3.com
# S3_FORCE_PATH_STYLE=true
# S3_ACCESS_KEY_ID=KEY_ID
# S3_SECRET_ACCESS_KEY=ACCES_KEY
# AWS_REGION=us-east-1

NEXT_PUBLIC_ENABLE_SBOM_UPLOAD='false'
NEXT_PUBLIC_CVE_MAPPING_ENABLED='true'

#_NEXT_PUBLIC_ENABLE_SCAN_API='true' # Still under development


```

## Available Scripts

- `npm run dev` - Start development server
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

