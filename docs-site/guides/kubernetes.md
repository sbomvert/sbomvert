---
title: Deploy on Kubernetes
description: Install SBOMVert on Kubernetes with its Helm chart, configure storage and live scans, and upgrade a release.
---

# Deploy on Kubernetes

The Helm chart in `charts/sbomvert` deploys the SBOMVert web app, Redis, SeaweedFS as S3 storage, and optionally the scan worker. This guide installs it, explains the values it accepts, and covers access, upgrades and what data persists.

## What the chart deploys

| Resource | Name | When |
|---|---|---|
| App Deployment + Service (ClusterIP) | `<release>-app`, port `3000` | always |
| Redis Deployment | `<release>-redis`, Service `redis` | always |
| Redis PVC | `<release>-redis-data` | `redis.persistence.enabled` |
| S3 credentials Secret | `<release>-s3` (keys `accessKey`, `secretKey`) | always |
| SeaweedFS Deployment | `<release>-seaweedfs`, Service `seaweedfs`, port `8333` | `seaweedfs.enabled` |
| SeaweedFS PVC | `<release>-seaweedfs-data` | `seaweedfs.enabled` and `seaweedfs.persistence.enabled` |
| Worker Deployment | `<release>-worker` | `scan.enabled` |
| Worker database PVC | `<release>-worker-dbs` | `scan.enabled` |

```text
                ┌──────────────── namespace ────────────────┐
  port-forward  │  <release>-app ──▶ Service redis ──▶ <release>-redis
  or your own ─▶│      │                     ▲
  ingress       │      │ S3                  │ (scan.enabled)
                │      ▼                     │
                │  Service seaweedfs    <release>-worker ──▶ registries
                │      │                     │
                │  <release>-seaweedfs   PVC <release>-worker-dbs
                │      │
                │  PVC <release>-seaweedfs-data
                └────────────────────────────────────────────┘
```

::: warning One release per namespace
The Redis and SeaweedFS Services are named `redis` and `seaweedfs`, without the release name. Two releases in the same namespace would conflict. Install each release in its own namespace.
:::

## Install

1. **Install the chart.** From the published OCI chart:

   ```bash
   helm install sbomvert oci://ghcr.io/sbomvert/charts/sbomvert --version <version> \
     --namespace sbomvert --create-namespace
   ```

   Or from a clone of the repository:

   ```bash
   helm install sbomvert ./charts/sbomvert --namespace sbomvert --create-namespace
   ```

2. **Check the pods.**

   ```bash
   kubectl -n sbomvert get pods
   ```

   Expected: `sbomvert-app-...`, `sbomvert-redis-...` and `sbomvert-seaweedfs-...` are `Running`. SeaweedFS creates the `sbomvert` bucket once its server is up.

3. **Open the app.** The chart has no Ingress; the app Service is `ClusterIP`. For a quick look:

   ```bash
   kubectl -n sbomvert port-forward svc/sbomvert-app 3000:3000
   ```

   Then open `http://localhost:3000`. For permanent access, create your own Ingress or Gateway route to Service `<release>-app`, port `3000`.

The bucket starts empty, so `/compare` lists nothing until you add reports (see [Add your own reports](/guides/add-reports)) or run scans.

## Set the S3 credentials

The default secret key is `change-me`. Change it for any real deployment:

```yaml
# values-prod.yaml
app:
  env:
    S3_ACCESS_KEY_ID: sbomvert
    S3_SECRET_ACCESS_KEY: a-strong-secret
```

```bash
helm upgrade --install sbomvert ./charts/sbomvert -n sbomvert -f values-prod.yaml
```

Both values go into the `<release>-s3` Secret, which the app and the bundled SeaweedFS read. SeaweedFS writes its identity config from these values at each start, so changing them and restarting both pods keeps them in sync.

## Values reference

These are all the values in `values.yaml`.

### App

| Value | Default | Description |
|---|---|---|
| `app.image.repository` | `ghcr.io/sbomvert/sbomvert` | App image (built from `Dockerfile`). |
| `app.image.tag` | `latest` | Image tag. |
| `app.image.pullPolicy` | `IfNotPresent` | Pull policy. |
| `app.port` | `3000` | Container and Service port. |
| `app.env.REDIS_HOST` | `redis` | Redis hostname, used by the app and the worker. |
| `app.env.ARTIFACT_BACKEND_TYPE` | `s3` | `s3` or `local`. |
| `app.env.S3_ENDPOINT` | `http://seaweedfs:8333` | S3 endpoint. |
| `app.env.S3_FORCE_PATH_STYLE` | `"true"` | Path-style S3 URLs. |
| `app.env.S3_ACCESS_KEY_ID` | `sbomvert` | Stored in `<release>-s3`. |
| `app.env.S3_SECRET_ACCESS_KEY` | `change-me` | Stored in `<release>-s3`. Change it. |
| `app.env.SBOM_S3_BUCKET` / `CVE_S3_BUCKET` | `sbom` / `cve` | Set on the pod but not used by the app: it always uses the `sbomvert` bucket. |

The app container always runs with `NODE_ENV=production`, and `NEXT_PUBLIC_ENABLE_SCAN_API` is set from `scan.enabled`.

### Live scans

| Value | Default | Description |
|---|---|---|
| `scan.enabled` | `false` | Enables the scan page and API in the app and deploys the worker. |
| `worker.replicas` | `1` | Worker replicas. |
| `worker.concurrency` | `1` | `SCAN_CONCURRENCY` for each worker. Keep `1`. |
| `worker.cache.dbs.size` | `10Gi` | PVC for the Grype and Trivy databases, mounted at `/cache/dbs`. |
| `worker.image.repository` | `ghcr.io/sbomvert/sbomvert-worker` | Worker image (`worker/Dockerfile`). |
| `worker.image.tag` | `latest` | Image tag. |
| `worker.image.pullPolicy` | `IfNotPresent` | Pull policy. |

### Redis

| Value | Default | Description |
|---|---|---|
| `redis.image.repository` / `tag` / `pullPolicy` | `redis` / `7-alpine` / `IfNotPresent` | Redis image. |
| `redis.port` | `6379` | Container and Service port. |
| `redis.persistence.enabled` | `true` | Keep `/data` on a PVC. |
| `redis.persistence.size` | `1Gi` | PVC size. |

### SeaweedFS

| Value | Default | Description |
|---|---|---|
| `seaweedfs.enabled` | `true` | Deploy SeaweedFS. Disable it to use an external S3. |
| `seaweedfs.image.repository` / `tag` / `pullPolicy` | `chrislusf/seaweedfs` / `4.53` / `IfNotPresent` | SeaweedFS image. |
| `seaweedfs.port` | `8333` | S3 API port. |
| `seaweedfs.persistence.enabled` | `true` | Keep objects on a PVC; otherwise `emptyDir` (lost when the pod is replaced). |
| `seaweedfs.persistence.size` | `10Gi` | PVC size. |

## Enable live scans

```yaml
# values-scan.yaml
scan:
  enabled: true
```

```bash
helm upgrade --install sbomvert ./charts/sbomvert -n sbomvert -f values-scan.yaml
```

This deploys `<release>-worker` with a PVC for its vulnerability databases and turns on `/scan` in the app. On first start the worker downloads the databases, which takes several minutes; follow it with:

```bash
kubectl -n sbomvert logs deploy/sbomvert-worker -f
```

Expected: `scan worker listening on queue "scan"`.

::: warning Worker settings the chart does not expose
The worker Deployment only sets `REDIS_HOST` and `SCAN_CONCURRENCY`. `RUN_EXPERIMENT_TIMEOUT` (default 3 minutes per tool), `DB_REFRESH_HOURS` (default 24) and the Docker Scout credentials `DOCKER_SCOUT_HUB_USER` / `DOCKER_SCOUT_HUB_PASSWORD` cannot be set through values, so Scout runs fail on a chart deployment. Adding them requires editing `templates/worker-deployment.yaml`.
:::

The worker PVC is `ReadWriteOnce`. With `worker.replicas` above 1, use a storage class that supports `ReadWriteMany`.

## Use an external S3

```yaml
# values-external-s3.yaml
app:
  env:
    S3_ENDPOINT: https://s3.amazonaws.com
    S3_FORCE_PATH_STYLE: "false"
    S3_ACCESS_KEY_ID: AKIA...
    S3_SECRET_ACCESS_KEY: ...
seaweedfs:
  enabled: false
```

The bucket must be named `sbomvert` and exist already. The chart does not set `AWS_REGION`, so requests are signed for `us-east-1`. See [Use S3 storage](/guides/s3-storage).

## Use local storage

```yaml
# values-local.yaml
app:
  env:
    ARTIFACT_BACKEND_TYPE: local
seaweedfs:
  enabled: false
```

::: danger Local storage is not persistent in the chart
The app Deployment has no volume. With `local`, reports are read from and written to the container filesystem (`./public/sbom` and `./public/cves` by default, since the chart sets neither `SBOM_DIR` nor `CVE_DIR`). Uploads and scan results are lost whenever the pod restarts.
:::

## Authentication

The chart has no values for sign-in and does not deploy Postgres. `NEXT_PUBLIC_ENABLE_AUTH`, `BETTER_AUTH_SECRET`, `DATABASE_URL` and the GitHub OAuth variables are not set, so a chart deployment runs with sign-in off and `/api/scan` accepts unauthenticated requests when scans are enabled. Restrict network access to the app accordingly. See [Authentication](/guides/authentication) and [Hardening](/security/hardening).

Likewise, `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD` and `NEXT_PUBLIC_CVE_MAPPING_ENABLED` are not set by the chart.

## Upgrade

```bash
helm upgrade sbomvert oci://ghcr.io/sbomvert/charts/sbomvert --version <new-version> \
  -n sbomvert -f values-prod.yaml
```

- Pass the same values files as at install time (or `--reuse-values`), or your overrides are reset to defaults.
- The default image tags are `latest` with `IfNotPresent`: a node that already has `latest` will not pull a newer one. Pin `app.image.tag` and `worker.image.tag` to a version and change them to upgrade, or run `kubectl rollout restart` with `pullPolicy: Always`.
- SeaweedFS uses the `Recreate` strategy, so it is briefly unavailable during an upgrade.
- Upgrading from a chart version that used MinIO: SeaweedFS starts on a new volume and does not copy MinIO's data. Copy your objects first (for example with `aws s3 sync` or `rclone`), or point `app.env.S3_ENDPOINT` at the old storage and set `seaweedfs.enabled: false`.

## What persists

| Data | Where | Survives pod restart | Notes |
|---|---|---|---|
| SBOMs and CVE reports (S3) | `<release>-seaweedfs-data` PVC, or your external bucket | yes | With `seaweedfs.persistence.enabled: false`, lost when the pod is replaced. |
| SBOMs and CVE reports (local) | app container filesystem | no | See the warning above. |
| Scan queue and job history | `<release>-redis-data` PVC | yes | Last 500 completed and 500 failed jobs. |
| Vulnerability databases | `<release>-worker-dbs` PVC | yes | Re-downloaded only when refreshed. |

The PVCs are created by the chart without a keep policy, so `helm uninstall` removes them together with their data. Copy the bucket contents out first if you need them.

## Related

- [Use S3 storage](/guides/s3-storage)
- [Run live scans](/guides/live-scans)
- [Architecture overview](/architecture/)
- [Hardening](/security/hardening)
- [Troubleshooting](/guides/troubleshooting)
