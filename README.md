# SBOMVert 

SBOMVert is web app for comparing SBOM (Software Bill of Materials) and CVE reports across different tools.

> [!CAUTION]
> The tool is under active development and is intended for educational purposes


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

The application behavior can be configured via the following environment variables:

- `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD` (default: `false`) – Enables the SBOM upload UI.
- `NEXT_PUBLIC_ENABLE_SCAN_API` (default: `false`) – Enables the scan API endpoints.
- `NEXT_PUBLIC_CVE_MAPPING_ENABLED` (default: `false`) – Enables CVE mapping features.
- `SBOM_DIR` – Directory path for local SBOM storage in development (defaults to `./public/sbom`).
- `NODE_ENV` – `development` or `production`; determines storage implementation.
- `AWS_REGION` – AWS region for S3 storage (default: `us-east-1`).
- `S3_ENDPOINT` – Custom S3‑compatible endpoint (e.g., MinIO, DigitalOcean Spaces).
- `S3_FORCE_PATH_STYLE` – Set to `true` to force path‑style URLs for S3.
- `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` – Credentials for S3 when using a custom endpoint.

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

## Dataset

A sample dataset for the app is available [here](https://box.roc.cnam.fr/index.php/s/XQRa9dXz7bpWGRf)

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

