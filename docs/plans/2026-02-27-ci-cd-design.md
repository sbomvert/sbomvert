# CI/CD Design – GitHub Actions + GitHub Container Registry + Vercel (Docker‑only)

## Overview
The repository will use a single GitHub Actions workflow to run linting, testing, build the Next.js app, create a Docker image, and push it to **GitHub Container Registry (ghcr.io)**. Vercel is connected to the repository via its Git integration and is configured to deploy the latest Docker image automatically. No explicit Vercel CLI steps are required. The Docker image is built and pushed only when a tag is pushed.

## Workflow (`.github/workflows/ci.yml`)
```yaml
name: CI – Test, Build & Publish Docker Image

on:
  pull_request:
    branches: [ "**" ]
  push:
    branches: [ "main" ]

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js production bundle
        run: npm run build

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract image tag
        id: meta
        run: |
          echo "tag=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Build Docker image
        run: |
          docker build \
            --label "org.opencontainers.image.source=${{ github.repositoryUrl }}" \
            --label "org.opencontainers.image.revision=${GITHUB_SHA}" \
            -t ghcr.io/${{ github.repository_owner }}/${{ github.event.repository.name }}:${{ steps.meta.outputs.tag }} \
            .

      - name: Push Docker image
        run: |
          docker push ghcr.io/${{ github.repository_owner }}/${{ github.event.repository.name }}:${{ steps.meta.outputs.tag }}

on:
  push:
    branches: [ "**" ]   # any branch or tag
  workflow_dispatch:       # manual trigger

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build Next.js production bundle
        run: npm run build

      # Docker
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract image tag
        id: meta
        run: |
          echo "tag=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Build Docker image
        run: |
          docker build \
            --label "org.opencontainers.image.source=${{ github.repositoryUrl }}" \
            --label "org.opencontainers.image.revision=${GITHUB_SHA}" \
            -t ghcr.io/${{ github.repository_owner }}/${{ github.event.repository.name }}:${{ steps.meta.outputs.tag }} \
            .

      - name: Push Docker image
        run: |
          docker push ghcr.io/${{ github.repository_owner }}/${{ github.event.repository.name }}:${{ steps.meta.outputs.tag }}
```

## Dockerfile (root of repository)
```dockerfile
# ---------- Build stage ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["node", "server.js"]
```

## Vercel Configuration
1. Connect the GitHub repository in the Vercel dashboard.
2. In *Project Settings → General* set **Framework Preset** to **Other** and choose **Docker** as the build method.
3. Set the Docker image source to `ghcr.io/<owner>/<repo>:*` so Vercel always pulls the latest tag.
4. (Optional) Define any runtime environment variables required by the app in Vercel.

## Secrets & Permissions
- `GITHUB_TOKEN` (provided automatically) – used by `docker/login-action` to push to ghcr.io.
- No additional Vercel token is needed because Vercel pulls the image itself.

## What This Does Not Do
- No tag‑based deployment gating – Docker image is built and pushed only when a tag is pushed.
- No explicit `vercel` CLI invocation – reduces secret handling and simplifies the workflow.

---

*Design approved?* If so, the next step is to create the implementation plan via the `writing-plans` skill.
