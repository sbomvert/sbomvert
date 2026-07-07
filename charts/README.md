# SBOMvert Helm Chart

Helm chart for deploying [SBOMvert](https://github.com/sbomvert/sbomvert) — a SBOM comparison tool for Syft, Trivy, and Docker Scout.

## Components

| Component | Description |
|-----------|-------------|
| `sbomvert` | Next.js application (port 3000) |
| `redis` | Job queue backend (BullMQ) |
| `minio` | S3-compatible object storage for SBOMs and CVE reports |

## Installing

```bash
helm install sbomvert oci://ghcr.io/sbomvert/charts/sbomvert --version <version>
```

To override values:

```bash
helm install sbomvert oci://ghcr.io/sbomvert/charts/sbomvert \
  --set app.image.tag=v1.2.3 \
  --set minio.rootPassword=changeme
```

## Parameters

### App

| Parameter | Description | Default |
|-----------|-------------|---------|
| `app.image.repository` | Container image repository | `ghcr.io/sbomvert/sbomvert` |
| `app.image.tag` | Container image tag | `latest` |
| `app.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `app.port` | Port the app listens on | `3000` |
| `app.env.NODE_ENV` | Node environment | `production` |
| `app.env.REDIS_HOST` | Hostname of the Redis service | `redis` |
| `app.env.ARTIFACT_BACKEND_TYPE` | Storage backend (`local` or `s3`) | `s3` |
| `app.env.S3_ENDPOINT` | S3-compatible endpoint URL | `http://minio:9000` |
| `app.env.S3_ACCESS_KEY_ID` | S3 access key | `minioadmin` |
| `app.env.S3_SECRET_ACCESS_KEY` | S3 secret key | `minioadmin` |
| `app.env.SBOM_S3_BUCKET` | S3 bucket for SBOM files | `sbom` |
| `app.env.CVE_S3_BUCKET` | S3 bucket for CVE reports | `cve` |

### Redis

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.image.repository` | Redis image repository | `redis` |
| `redis.image.tag` | Redis image tag | `7-alpine` |
| `redis.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `redis.port` | Redis port | `6379` |
| `redis.persistence.enabled` | Enable persistent volume for Redis data | `true` |
| `redis.persistence.size` | PVC size for Redis | `1Gi` |

### MinIO

| Parameter | Description | Default |
|-----------|-------------|---------|
| `minio.image.repository` | MinIO image repository | `minio/minio` |
| `minio.image.tag` | MinIO image tag | `latest` |
| `minio.image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `minio.port` | MinIO S3 API port | `9000` |
| `minio.consolePort` | MinIO web console port | `9001` |
| `minio.rootUser` | MinIO root username | `minioadmin` |
| `minio.rootPassword` | MinIO root password | `minioadmin` |
| `minio.defaultBuckets` | Comma-separated list of buckets to create | `sbom,cve` |
| `minio.persistence.enabled` | Enable persistent volume for MinIO data | `true` |
| `minio.persistence.size` | PVC size for MinIO | `10Gi` |

## Common Configurations

### Use an external S3 bucket instead of MinIO

```yaml
# values-external-s3.yaml
app:
  env:
    S3_ENDPOINT: https://s3.amazonaws.com
    S3_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
    S3_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    SBOM_S3_BUCKET: my-sbom-bucket
    CVE_S3_BUCKET: my-cve-bucket

minio:
  persistence:
    enabled: false
```

### Use local filesystem storage (no S3)

```yaml
# values-local.yaml
app:
  env:
    ARTIFACT_BACKEND_TYPE: local
```

### Change credentials for production

```yaml
# values-prod.yaml
minio:
  rootUser: my-admin-user
  rootPassword: a-strong-password

app:
  env:
    S3_ACCESS_KEY_ID: my-admin-user
    S3_SECRET_ACCESS_KEY: a-strong-password
```

### Disable persistence (ephemeral / dev)

```yaml
redis:
  persistence:
    enabled: false

minio:
  persistence:
    enabled: false
```

## Upgrading

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
