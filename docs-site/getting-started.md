---
title: Getting Started
---

# Getting Started

This guide walks you through installing SBOMVert and loading data so you can
start comparing reports.

## How SBOMVert ingests data

There are two ways to feed SBOM/CVE data into the app:

1. **Pre-generated data (default)** SBOMs and CVE reports are static JSON
   files read from storage or uploded via UI. This is the primary path and what the
   `/compare` view reads.
2. **Live scan.** SBOMVert can generate SBOMs and CVE reports
   from a number of tools on demand. It is off by default and requires
   additional setup.

A sample dataset is available
[here](https://box.roc.cnam.fr/index.php/s/XQRa9dXz7bpWGRf).



## Installation



### Kubernetes Deployment (Helm Chart)


```bash
  # Add the repo 
  helm repo add sbomvert https://sbomvert.github.io/sbomvert/charts
  helm repo update

  # Install
  helm install sbomvert sbomvert/sbomvert
```

**Key values** (see `charts/sbomvert/values.yaml` for the full list):

| Value                     | Default                        | Description                          |
| ------------------------- | ------------------------------ | ------------------------------------ |
| `app.image.repository`    | `ghcr.io/sbomvert/sbomvert`    | Application image                    |
| `app.image.tag`           | `latest`                       | Image tag                            |
| `app.port`                | `3000`                         | App container port                   |
| `app.env`                 | —                              | Environment variables passed to the app |                    |


#### Accessing the app

The chart exposes the app through a `ClusterIP` service (`sbomvert-app`) on port
`3000`, so it is only reachable from inside the cluster by default. To reach it
from your machine, forward the port:

```bash
kubectl port-forward svc/sbomvert-app 3000:3000
# then open http://localhost:3000
```

### Containerized Deployment

SBOMVert can be deployed locally as a standalone container. 

```bash
docker run --rm -p 3000:3000 \
  -e ARTIFACT_BACKEND_TYPE=local \
  -e SBOM_DIR=/app/public/sbom \
  -e CVE_DIR=/app/public/cve \
  ghcr.io/sbomvert/sbomvert:latest
```
::: warning
This command will store the data you add locally on the container and will be deleted when the container exits. **Add an external volume to avoid data loss**.
:::

### Locally

Best for development and trying SBOMVert out.

**Prerequisites**

- Node.js >= 22 (managed via [nvm](https://github.com/nvm-sh/nvm))
- npm >= 10

**Steps**

```bash
# 1. Use the pinned Node version
nvm install
nvm use

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
