---
title: Use S3 storage
description: Store SBOMs and CVE reports in SeaweedFS, AWS S3 or another S3-compatible service instead of a local folder.
---

# Use S3 storage

By default SBOMVert reads and writes reports in local folders. With the S3 backend it uses an S3-compatible bucket instead, which suits containers and clusters where the app's filesystem is not persistent. This guide covers SeaweedFS, AWS S3, and other S3 providers.

## How the S3 backend works

- Set `ARTIFACT_BACKEND_TYPE=s3`. Any other value, or no value, uses local folders.
- The bucket name is fixed in code: **`sbomvert`**. It must exist before the app starts writing.
- SBOMs are stored under `sbom/<image>/<tool>.<format>.json`, CVE reports under `cves/<image>/<tool>.<format>.json`.
- The scanners' own output from live scans goes under `cve-raw/`, or under the prefix set by `CVE_RAW_PREFIX`. `/compare` does not read that prefix.
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
| `CVE_RAW_PREFIX` | `cve-raw/` | Prefix for the scanners' raw output from live scans. A trailing `/` is added if you leave it out. The local equivalent is `CVE_RAW_DIR`. |

When `S3_ENDPOINT` is not set, the app passes no credentials to the AWS SDK, so the SDK's default credential chain applies: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, a shared config profile, or an attached IAM role.

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
