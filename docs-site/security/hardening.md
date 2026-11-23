---
title: Hardening checklist
description: A production checklist for SBOMVert that uses only the settings the app, the worker, Docker Compose and the Helm chart actually provide.
---

# Hardening checklist

This checklist is for running SBOMVert where people other than you can reach it. Each item uses a setting that exists in SBOMVert today, or a control you add around it, and says which. For the reasoning behind each item, see the [Security model](/security/).

## 1. Choose the smallest deployment

- **Use the [static build](/guides/static-build) if you only need analysis and translation.** `npm run build:static` produces HTML and JavaScript with no server code. SBOMs stay in the browser. Nothing else on this page applies to it.
- **Leave optional features off unless you need them.** All of these default to off:

  | Variable | Turns on | Leave off unless |
  | --- | --- | --- |
  | `NEXT_PUBLIC_ENABLE_SCAN_API` (Helm: `scan.enabled`) | Live scans, Redis queue, worker | You need on-demand scans. |
  | `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD` | `POST /api/sbom/upload` | Only trusted users can reach the app. Upload has no authentication. |
  | `NEXT_PUBLIC_ENABLE_AUTH` | Sign-in, API keys, scan API protection | Never leave this off while the scan API is reachable by others. |

- **Treat stored data as public.** `GET /api/sbom/*` and `GET /api/cve/*` are never authenticated. Do not store SBOMs of private images on an instance others can reach, unless access to the whole app is restricted by the network or a reverse proxy.

## 2. Authentication

Required before you expose the scan API. See [Authentication and API keys](/guides/authentication).

- **Set `NEXT_PUBLIC_ENABLE_AUTH=true` at build time.** Next.js inlines it into the build.
- **Generate a strong `BETTER_AUTH_SECRET`** with `openssl rand -base64 32`, one per environment. Store it in your secret manager, not in a committed file.
- **Set `BETTER_AUTH_URL` to the public `https://` URL**, and register `https://<host>/api/auth/callback/github` as the callback of a GitHub OAuth app for this environment only.
- **Decide who may sign in.** SBOMVert lets any GitHub account sign in. To limit access, put the app behind a VPN or an authenticating reverse proxy.
- **Use expiring API keys** (7, 30 or 90 days), one per script or user, and delete keys you no longer use in **Settings → Security**.
- **Do not rely on magic links.** Production builds refuse them, because no email sending is configured. Development servers log working sign-in links, so do not ship development logs anywhere shared.
- **Run `npx drizzle-kit push` after upgrades** that change `src/db/schema.ts`.

## 3. TLS and the edge

- **Terminate TLS in front of the app.** The app serves plain HTTP on port 3000. The Helm chart creates only a `ClusterIP` Service and no Ingress, so add your own Ingress or reverse proxy with TLS.
- **Expose only the app.** No other component needs to be reachable from outside.
- **Add rate limiting at the proxy.** SBOMVert limits API keys to 50 requests per hour, but it does not limit browser sessions or the number of queued scans. Limit `POST /api/scan` at your proxy.
- **Add security headers at the proxy** (Content-Security-Policy, HSTS, `X-Content-Type-Options`). The app does not set them.

## 4. Network

- **Do not publish Redis, Postgres or SeaweedFS.** `docker-compose.yml` is a development setup that publishes `6379` (Redis), `5432` (Postgres) and `8333` (SeaweedFS S3) on all interfaces. For anything beyond your own machine, remove those `ports:` entries or bind them to `127.0.0.1`.
- **Isolate Redis.** SBOMVert cannot use a Redis password or TLS (only `REDIS_HOST` and `REDIS_PORT` exist). Anyone who can reach Redis can change jobs and results. In Kubernetes, add a `NetworkPolicy` that only lets the app and worker pods reach Redis. The chart does not include one.
- **Restrict the worker's outbound traffic.** The worker pulls whatever image a user names, including from private IP addresses. Allow DNS and the registries and database hosts you need, and deny private ranges and cluster-internal addresses. Use a `NetworkPolicy` or an egress firewall; the chart does not include one.
- **Put the worker in its own namespace or node pool** if your cluster runs other workloads. It runs third-party parsers on untrusted images, as root.

## 5. Credentials

- **Change the S3 key pair.** The chart's `values.yaml` defaults to `S3_ACCESS_KEY_ID: sbomvert` and `S3_SECRET_ACCESS_KEY: change-me`. Set your own in a private values file or with `--set`. The chart stores them in the `<release>-s3` Secret.
- **Never reuse `.env.dev`.** It is committed to the repository and holds development credentials.
- **Rotate S3 keys** by updating the Secret (with `helm upgrade` and new values) and restarting the pods that read it. Both the app and SeaweedFS read the keys only at startup:

  ```bash
  helm upgrade sbomvert oci://ghcr.io/sbomvert/charts/sbomvert -f my-values.yaml
  kubectl rollout restart deployment/sbomvert-app deployment/sbomvert-seaweedfs
  ```

  With an external S3 service, create the new key there first, roll out the app, then revoke the old key.
- **Use a dedicated Docker Hub account** for `DOCKER_SCOUT_HUB_USER` and `DOCKER_SCOUT_HUB_PASSWORD`, with nothing else in it, or leave them unset and do not offer Scout. The worker runs untrusted input next to these credentials.
- **Use a strong Postgres password** in `DATABASE_URL`. The Compose default is `sbomvert`.

## 6. Scan limits

These are the limits the worker supports:

| Setting | Default | Recommendation |
| --- | --- | --- |
| `SCAN_CONCURRENCY` (Helm: `worker.concurrency`) | `1` | Keep `1`. Trivy and Grype runs share a cache lock. |
| `worker.replicas` (Helm) | `1` | Raise only with ReadWriteMany storage for the database volume. |
| `RUN_EXPERIMENT_TIMEOUT` | `180000` ms | Lower it to bound how long one tool run can take. |

Tool output is capped at 50 MB per run, and Redis keeps the last 500 jobs. There is no limit on how many scans can be queued, so rely on authentication and proxy rate limits. The chart does not expose `RUN_EXPERIMENT_TIMEOUT`, so set it with your own patch if you need it.

Also consider adding resource requests and limits, and a restrictive `securityContext`, to the worker Deployment. The chart sets neither.

## 7. Images and versions

- **Pin image tags.** The chart defaults `app.image.tag` and `worker.image.tag` to `latest`, which the release workflow overwrites on every release. Set both to a release version:

  ```yaml
  app:
    image:
      tag: "<version>"
  worker:
    image:
      tag: "<version>"
  ```

- **Pin Redis more tightly** if you need reproducibility. The chart uses `redis:7-alpine`, which moves with every 7.x release. SeaweedFS is already pinned (`4.53`).
- **Rebuild the worker deliberately.** Scanner versions are build arguments in `worker/Dockerfile` and Dependabot does not update them. Some downloads are not checksum-verified (OSV-Scanner, Amazon Inspector) and the Docker Scout plugin comes from its `main` branch. Build the worker yourself and mirror it to your registry if you need a verified chain.

## 8. Vulnerability databases

- **Keep the database volume.** The worker stores the Grype and Trivy databases in `/cache/dbs`: a persistent volume in the chart (`worker.cache.dbs.size`, 10 Gi by default) and the external `sbomvert-scan-dbs` volume in Compose.
- **Keep them fresh.** The worker downloads the databases at startup and refreshes them every `DB_REFRESH_HOURS` (24 by default). A failed update is logged and the cached copy is used, so watch the worker logs for `database update failed`. The chart does not expose `DB_REFRESH_HOURS`; the default applies.
- **Record the scan date** when you compare reports. Results depend on the database at scan time.

## Quick reference

```text
[ ] static build if only analysis/translation is needed
[ ] upload off; scan API off unless needed
[ ] auth on (at build time) before the scan API is reachable
[ ] strong BETTER_AUTH_SECRET; BETTER_AUTH_URL is https; per-env GitHub OAuth app
[ ] access to sign-in limited by network or proxy if needed
[ ] TLS, rate limits and security headers at the reverse proxy / ingress
[ ] Redis, Postgres, SeaweedFS not published; NetworkPolicy for Redis
[ ] worker egress restricted; worker isolated
[ ] S3 keys changed from defaults and rotated; .env.dev not reused
[ ] image tags pinned (not latest)
[ ] database volume persisted; refresh failures monitored
```

## Related

- [Security model](/security/)
- [Authentication and API keys](/guides/authentication)
- [Kubernetes (Helm)](/guides/kubernetes)
- [Static build](/guides/static-build)
