---
title: Use S3 storage
description: Store SBOMs and CVE reports in SeaweedFS, AWS S3 or another S3-compatible service instead of a local folder.
---

# Use S3 storage

By default SBOMVert reads and writes reports in local folders. With the S3 backend it uses an S3-compatible bucket instead, which suits containers and clusters where the app's filesystem is not persistent. This guide covers the bundled SeaweedFS in Docker Compose, AWS S3, and other S3 providers.

## How the S3 backend works

- Set `ARTIFACT_BACKEND_TYPE=s3`. Any other value, or no value, uses local folders.
- The bucket name is fixed in code: **`sbomvert`**. It must exist before the app starts writing.
- SBOMs are stored under `sbom/<image>/<tool>.<format>.json`, CVE reports under `cves/<image>/<tool>.<format>.json`.
- `<image>` is the sanitized image name: `/` becomes `slash`, `:` becomes `twodots` (for example `alpinetwodots3.20`).

::: warning `S3_BUCKET` and `S3_PREFIX` do not move your reports
These two variables only configure `src/services/artifactStorageService`, which no current page or route uses. The SBOM and CVE services always use the `sbomvert` bucket with the `sbom/` and `cves/` prefixes. The Helm values `SBOM_S3_BUCKET` and `CVE_S3_BUCKET` are not used by the app either.
:::

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ARTIFACT_BACKEND_TYPE` | `local` | Set to `s3`. |
| `S3_ENDPOINT` | unset | Endpoint URL for a non-AWS service, such as `http://seaweedfs:8333`. Leave unset for AWS. |
| `S3_FORCE_PATH_STYLE` | `false` | `true` uses path-style URLs (`https://endpoint/sbomvert/key`). Required by SeaweedFS and most self-hosted services. |
| `S3_ACCESS_KEY_ID` | unset | Access key. **Only used when `S3_ENDPOINT` is set.** |
| `S3_SECRET_ACCESS_KEY` | unset | Secret key. **Only used when `S3_ENDPOINT` is set.** |
| `AWS_REGION` | `us-east-1` | Region used to sign requests. |

When `S3_ENDPOINT` is not set, the app passes no credentials to the AWS SDK, so the SDK's default credential chain applies: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, a shared config profile, or an attached IAM role.

## SeaweedFS with Docker Compose

`docker-compose.yml` includes SeaweedFS as the S3 server. It reads its access key and secret from `.env.dev` (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`), the same pair the app uses, and a one-shot `seaweedfs-init` service creates the `sbomvert` bucket. The app and worker start only after `seaweedfs-init` has completed.

`.env.dev` already contains the S3 settings, but sets `ARTIFACT_BACKEND_TYPE=local`. To switch:

1. **Edit `.env.dev`** and set:

   ```bash
   ARTIFACT_BACKEND_TYPE=s3
   ```

   The other values are already there:

   ```bash
   S3_ENDPOINT=http://seaweedfs:8333
   S3_FORCE_PATH_STYLE=true
   S3_ACCESS_KEY_ID=sbomvert
   S3_SECRET_ACCESS_KEY=sbomvert-dev-secret
   AWS_REGION=us-east-1
   ```

2. **Restart the stack** so the app picks up the new backend:

   ```bash
   docker compose up
   ```

   Expected: the `seaweedfs-init-dev` container logs the bucket creation (or that it already exists) and exits with code 0.

3. **Add data.** The bucket starts empty; the bundled dataset in `public/` is not copied into it. Upload SBOMs (with `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD=true`), run live scans, or copy files in with any S3 client. SeaweedFS's S3 API is published on `localhost:8333`:

   ```bash
   export AWS_ACCESS_KEY_ID=sbomvert AWS_SECRET_ACCESS_KEY=sbomvert-dev-secret
   aws --endpoint-url http://localhost:8333 s3 cp public/sbom/ s3://sbomvert/sbom/ --recursive
   aws --endpoint-url http://localhost:8333 s3 cp public/cve/  s3://sbomvert/cves/ --recursive
   ```

   Note the different prefix for CVE reports: `cves/`.

4. **Open `/compare`.** The images in the bucket are listed.

The data lives in the `seaweedfs_data` volume. `docker compose down -v` deletes it.

::: tip Running the app outside Compose
`seaweedfs` is a hostname inside the Compose network. If you run `npm run dev` on your machine against the Compose SeaweedFS, use `S3_ENDPOINT=http://localhost:8333`.
:::

## AWS S3

1. **Create a bucket named `sbomvert`** in your account. Bucket names are global, so this only works if the name is free.
2. **Grant access** to the identity the app runs as: `s3:ListBucket` on the bucket, and `s3:GetObject` and `s3:PutObject` on its objects.
3. **Configure the app.** Either rely on the default credential chain:

   ```bash
   ARTIFACT_BACKEND_TYPE=s3
   AWS_REGION=eu-west-1             # the bucket's region
   # credentials from AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, a profile, or an IAM role
   ```

   or set an explicit endpoint, which makes the app use `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`:

   ```bash
   ARTIFACT_BACKEND_TYPE=s3
   S3_ENDPOINT=https://s3.eu-west-1.amazonaws.com
   S3_FORCE_PATH_STYLE=false
   S3_ACCESS_KEY_ID=AKIA...
   S3_SECRET_ACCESS_KEY=...
   AWS_REGION=eu-west-1
   ```

4. **Restart the app** and open `/compare`.

## Other S3-compatible services

For MinIO, Ceph RGW, Garage, Cloudflare R2, DigitalOcean Spaces and similar services, set `S3_ENDPOINT` to the service's S3 URL and provide `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. Set `S3_FORCE_PATH_STYLE=true` unless the provider supports virtual-hosted URLs for your bucket. Create the `sbomvert` bucket first.

```bash
ARTIFACT_BACKEND_TYPE=s3
S3_ENDPOINT=https://s3.example.internal
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

## Kubernetes

The Helm chart uses S3 by default, with a bundled SeaweedFS and the credentials in a Secret. See [Deploy on Kubernetes](/guides/kubernetes).

## Checking the configuration

S3 errors during listing do not show in the UI: the list is just empty. Check the app's server logs:

| Log message | Likely cause |
|---|---|
| `Error listing SBOMs from S3:` | Wrong endpoint, credentials, bucket, region or path style. The AWS error follows. |
| `Error reading SBOM from S3: <key>` | The object does not exist or is not readable. |
| `Handling completed scan job <id> failed` | Writing a scan result failed (for example no `PutObject` permission). The app retries on its next start. |

See [Troubleshooting](/guides/troubleshooting#s3-access-denied-or-an-empty-compare-page-with-s3) for specific errors.

## Related

- [Storage backends](/architecture/storage)
- [Deploy on Kubernetes](/guides/kubernetes)
- [Troubleshooting](/guides/troubleshooting)
