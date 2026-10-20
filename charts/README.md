# SBOMvert Helm Chart

Helm chart for deploying [SBOMvert](https://github.com/sbomvert/sbomvert) — a SBOM comparison tool for Syft, Trivy, and Docker Scout.

## Components

| Component | Description |
|-----------|-------------|
| `sbomvert` | Next.js application (port 3000) |
| `redis` | Job queue backend (BullMQ) |
| `worker` | Scan worker: runs the SBOM/CVE tools for queued scans (deployed with `scan.enabled`) |
| `seaweedfs` | S3-compatible object storage for SBOMs and CVE reports|

## Installing

```bash
helm install sbomvert oci://ghcr.io/sbomvert/charts/sbomvert --version <version>
```

To override values:

```bash
helm install sbomvert oci://ghcr.io/sbomvert/charts/sbomvert \
  --set app.image.tag=v1.2.3 \
  --set app.env.S3_SECRET_ACCESS_KEY=a-strong-secret
```

## Parameters

### App

| Parameter | Description | Default |
|-----------|-------------|---------|
| `app.image.repository` | Container image repository | `ghcr.io/sbomvert/sbomvert` |
| `app.image.tag` | Container image tag | `latest` |
| `app.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `app.port` | Port the app listens on | `3000` |
| `app.env.REDIS_HOST` | Hostname of the Redis service | `redis` |
| `app.env.ARTIFACT_BACKEND_TYPE` | Storage backend (`local` or `s3`). Must be `s3` for the app to use SeaweedFS or any other S3 | `s3` |
| `app.env.S3_ENDPOINT` | S3-compatible endpoint URL | `http://seaweedfs:8333` |
| `app.env.S3_FORCE_PATH_STYLE` | Path-style S3 URLs (needed for SeaweedFS and most self-hosted S3) | `"true"` |
| `app.env.S3_ACCESS_KEY_ID` | S3 access key. Stored in the `<release>-s3` Secret; the bundled SeaweedFS uses the same pair | `sbomvert` |
| `app.env.S3_SECRET_ACCESS_KEY` | S3 secret key (same Secret). **Change it** | `change-me` |
| `app.env.SBOM_S3_BUCKET` / `app.env.CVE_S3_BUCKET` | Not used by the app yet: it always uses the `sbomvert` bucket (prefixes `sbom/` and `cves/`) | `sbom` / `cve` |

### Live scans

| Parameter | Description | Default |
|-----------|-------------|---------|
| `scan.enabled` | Enables the scan pages/API in the app (`NEXT_PUBLIC_ENABLE_SCAN_API`) and deploys the scan worker | `false` |
| `worker.replicas` | Worker replicas | `1` |
| `worker.concurrency` | Scans per worker run in parallel (trivy/grype share a cache lock, so keep 1) | `1` |
| `worker.cache.dbs.size` | PersistentVolumeClaim for the grype/trivy databases, kept across restarts | `10Gi` |
| `worker.image.repository` | Worker image (`worker/Dockerfile`) | `ghcr.io/sbomvert/sbomvert-worker` |
| `worker.image.tag` | Worker image tag | `latest` |
| `worker.image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Redis

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.image.repository` | Redis image repository | `redis` |
| `redis.image.tag` | Redis image tag | `7-alpine` |
| `redis.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `redis.port` | Redis port | `6379` |
| `redis.persistence.enabled` | Enable persistent volume for Redis data | `true` |
| `redis.persistence.size` | PVC size for Redis | `1Gi` |

### SeaweedFS (S3 storage)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `seaweedfs.enabled` | Deploy SeaweedFS. Disable it to use an external S3 (see below) | `true` |
| `seaweedfs.image.repository` | SeaweedFS image repository | `chrislusf/seaweedfs` |
| `seaweedfs.image.tag` | SeaweedFS image tag | `4.48` |
| `seaweedfs.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `seaweedfs.port` | S3 API port (Service `seaweedfs`) | `8333` |
| `seaweedfs.persistence.enabled` | Keep the stored objects on a PersistentVolumeClaim (otherwise `emptyDir`) | `true` |
| `seaweedfs.persistence.size` | PVC size for SeaweedFS | `10Gi` |

SeaweedFS takes its access key and secret from the `<release>-s3` Secret, the same pair the app
uses (`app.env.S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`), and creates the `sbomvert` bucket
on start. There is no separate SeaweedFS credentials file.

The app only stores artifacts in S3 when `app.env.ARTIFACT_BACKEND_TYPE` is `s3` (the default).
With `local` it ignores SeaweedFS, so disable it too (`seaweedfs.enabled: false`).

## Common Configurations

### Change the S3 credentials (do this for production)

```yaml
# values-prod.yaml
app:
  env:
    S3_ACCESS_KEY_ID: sbomvert
    S3_SECRET_ACCESS_KEY: a-strong-secret
```

The app and the bundled SeaweedFS both pick the new pair up from the `<release>-s3` Secret.

### Use an external S3 instead of SeaweedFS

```yaml
# values-external-s3.yaml
app:
  env:
    S3_ENDPOINT: https://s3.amazonaws.com
    S3_FORCE_PATH_STYLE: "false"
    S3_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
    S3_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

seaweedfs:
  enabled: false
```

The bucket must be called `sbomvert` and exist already.

### Use local filesystem storage (no S3)

```yaml
# values-local.yaml
app:
  env:
    ARTIFACT_BACKEND_TYPE: local

seaweedfs:
  enabled: false
```

### Enable live scans

```yaml
# values-scan.yaml
scan:
  enabled: true
```

This deploys the scan worker (image `ghcr.io/sbomvert/sbomvert-worker`) with a PersistentVolumeClaim for its vulnerability databases, and enables the scan pages in the app.

### Disable persistence (ephemeral / dev)

```yaml
redis:
  persistence:
    enabled: false

seaweedfs:
  persistence:
    enabled: false
```

## Upgrading

Upgrading from a chart version with MinIO: the chart now deploys SeaweedFS instead, on a new
volume, and does not copy MinIO's data. Copy your objects over (e.g. with `aws s3 sync` or
`rclone`) before removing the old `<release>-minio-data` PVC, or point `app.env.S3_ENDPOINT` at the
old storage and set `seaweedfs.enabled: false`.

```bash
helm upgrade sbomvert oci://ghcr.io/sbomvert/charts/sbomvert --version <new-version>
```

## Uninstalling

```bash
helm uninstall sbomvert
```

Note: PersistentVolumeClaims are not deleted automatically. Remove them manually if no longer needed:

```bash
kubectl delete pvc -l app.kubernetes.io/instance=sbomvert
```
