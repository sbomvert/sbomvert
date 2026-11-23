---
title: Authentication and API keys
description: Turn on sign-in with GitHub or magic links, set up Postgres, create API keys, and see exactly which routes require authentication.
---

# Authentication and API keys

SBOMVert can require sign-in for live scans. Authentication is **off by default**. When it is on, users sign in with GitHub (or a magic link in development), and scripts authenticate with an API key in the `x-api-key` header.

Authentication protects the **scan API only**. Reading SBOMs and CVE reports stays public. Read [What authentication protects](#what-authentication-protects) before you expose an instance.

## How it works

SBOMVert uses [Better Auth](https://www.better-auth.com/) with a Postgres database through Drizzle ORM (`src/lib/auth.ts`, `src/db/schema.ts`):

- **Sign-in methods:** GitHub OAuth, and magic link. Email and password sign-in is disabled.
- **Sessions:** a session cookie set by Better Auth after sign-in.
- **API keys:** created per user in the account settings, sent as `x-api-key`.
- **Routes:** Better Auth handles everything under `/api/auth/*`. The sign-in pages are under `/auth/*` and the account pages under `/settings/*`.

With `NEXT_PUBLIC_ENABLE_AUTH` unset or not `true`, `/auth/*`, `/settings/*` and `/api/auth/*` return 404, no Postgres connection is made, and scans need no sign-in. Authentication is never available in the [static build](/guides/static-build).

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_ENABLE_AUTH` | Yes | `true` turns authentication on. |
| `DATABASE_URL` | Yes | Postgres connection string. Also used by `drizzle-kit`. |
| `BETTER_AUTH_SECRET` | Yes | Secret Better Auth uses to sign sessions and tokens. Generate it with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Recommended | The public base URL of the app, e.g. `https://sbomvert.example.com`. Read by Better Auth to build callback and magic-link URLs. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | For GitHub sign-in | Credentials of your GitHub OAuth app. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose only | Credentials for the Compose `postgres` service. They default to `sbomvert`. |

If authentication is on and `DATABASE_URL` or `BETTER_AUTH_SECRET` is missing, the first request that needs auth fails with an error naming the missing variable.

::: warning Set the flag at build time
The app reads `NEXT_PUBLIC_ENABLE_AUTH` as `process.env.NEXT_PUBLIC_ENABLE_AUTH`. Next.js inlines `NEXT_PUBLIC_*` values written that way into the build. Set the flag when you build the app (`npm run build` or the Docker build), not only when you start it. The Helm chart does not set any authentication variables.
:::

## Enable authentication locally

These steps use Docker Compose and the settings file `.env.dev`.

1. **Add the variables** to `.env.dev`:

   ```bash
   NEXT_PUBLIC_ENABLE_AUTH='true'
   BETTER_AUTH_SECRET=<output of: openssl rand -base64 32>
   BETTER_AUTH_URL=http://localhost:3000
   GITHUB_CLIENT_ID=<from step 3>
   GITHUB_CLIENT_SECRET=<from step 3>
   # optional: Compose defaults to sbomvert / sbomvert / sbomvert
   POSTGRES_USER=sbomvert
   POSTGRES_PASSWORD=<a password>
   POSTGRES_DB=sbomvert
   ```

   Inside Compose, the app's `DATABASE_URL` is set for you and points to the `postgres-dev` container.

2. **Start the stack with Postgres.** The `postgres` service only runs with the `auth` profile:

   ```bash
   docker compose --profile auth up
   ```

3. **Create the tables.** Run this once from the host, with `DATABASE_URL` pointing to the Postgres port Compose publishes:

   ```bash
   DATABASE_URL=postgresql://sbomvert:<password>@localhost:5432/sbomvert npx drizzle-kit push
   ```

   `drizzle.config.ts` reads the schema from `src/db/schema.ts`. It creates the `user`, `session`, `account`, `verification` and `apikey` tables. Run the command again after upgrading SBOMVert if the schema changed.

4. **Restart the app** so it picks up the new variables, then open `http://localhost:3000/auth/sign-in`.

To run without Compose, start any Postgres server, set `DATABASE_URL` in your environment, run `npx drizzle-kit push`, and start the app with `npm run dev`.

## Set up GitHub sign-in

1. On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**. Create it under an organization if the instance is shared.
2. Fill in:
   - **Homepage URL:** your app's base URL, e.g. `http://localhost:3000`.
   - **Authorization callback URL:** `<base URL>/api/auth/callback/github`, e.g. `http://localhost:3000/api/auth/callback/github`.
3. Create the app, generate a client secret, and set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

Use a separate OAuth app per environment, since each app has a single callback URL.

::: danger Any GitHub account can sign in
SBOMVert does not restrict which GitHub users can sign in. There is no allowlist, no organization check and no roles. Anyone with a GitHub account who can reach your instance can create an account, submit scans and create API keys. If that is not acceptable, put the app behind a network boundary or an authenticating reverse proxy.
:::

## Magic link sign-in

A magic link is a one-time sign-in URL. **SBOMVert does not send email.** No SMTP or email provider is configured in the code (`src/lib/auth.ts`). What happens when a user requests a link depends on `NODE_ENV`:

- **Development** (`npm run dev`): the link is written to the server log as `Magic link for <email>: <url>`. Copy it from the log to sign in. This is useful for local testing only, because anyone who can read the log can sign in as that user.
- **Production** (`NODE_ENV=production`, which includes the Docker image and the Helm chart): the request fails with "Magic link sign-in needs email sending, which is not configured". The link is never logged.

In production, GitHub is the only working sign-in method.

## API keys

API keys let scripts call the scan API without a browser session.

### Create a key

1. Sign in, then open **Settings → Security** (`/settings/security`).
2. In the API keys section, create a key. Choose an expiry of 7, 30 or 90 days.
3. Copy the key when it is shown. Better Auth stores keys hashed, so the full key cannot be shown again.

From the same section you can rename and delete keys.

Key settings in `src/lib/auth.ts`:

- **Rate limit:** 50 requests per hour per key. Status polls count too, so poll sparingly.
- **Expiry:** between 7 and 90 days. A key created without one, for example through the API, expires after 30 days. No key is permanent.
- **Scope:** a key acts for the user who created it, and only on the scan API. It does not give a session, so it cannot manage the account or create other keys. There are no per-key permissions.

Organization-level API keys are not available. The UI contains organization components, but the organization plugin is not enabled on the server or in the client.

### Use a key

Send the key in the `x-api-key` header:

```bash
curl -X POST https://sbomvert.example.com/api/scan \
  -H "x-api-key: $SBOMVERT_API_KEY" \
  -H "content-type: application/json" \
  -d '{"image":"alpine:3.21","tools":{"producers":["syft","trivy"],"consumers":["grype","trivy"]}}'
```

The response is `202` with a `jobId`. Poll its status with the same header:

```bash
curl -H "x-api-key: $SBOMVERT_API_KEY" https://sbomvert.example.com/api/scan/status/<jobId>
```

An invalid or expired key returns `401` with `Unauthorized: Invalid or expired API key.`. If an `x-api-key` header is present, it is checked instead of the session cookie.

## What authentication protects

When both `NEXT_PUBLIC_ENABLE_AUTH` and `NEXT_PUBLIC_ENABLE_SCAN_API` are `true`, the request proxy (`src/proxy.tsx`) requires a valid session or API key for every path under `/api/scan`. `POST /api/scan` checks again in its route handler.

| Route | With authentication on |
| --- | --- |
| `POST /api/scan` | Session or API key required |
| `GET /api/scan/status/<jobId>` | Session or API key required |
| `GET /api/scan/status/recent` | Session or API key required |
| `GET /api/scan/tools` | Session or API key required |
| `/settings/*` | Session required (redirects to sign-in) |
| `/scan` page | Loads without sign-in; its API calls return `401` |
| `GET /api/sbom/*`, `GET /api/sbom-files` | **Public** |
| `GET /api/cve`, `GET /api/cve/*` | **Public** |
| `POST /api/sbom/upload` (when `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD=true`) | **Public** |
| `/compare/*`, `/translate` and the home page | **Public** |

With the scan API off, every `/api/scan` path and `/scan` redirect to `/`, whether or not authentication is on.

::: warning Signed-in users see each other's scans
Authorization is all or nothing. Any signed-in user can read the status of any job by its ID, and `GET /api/scan/status/recent` lists recent scans from all users.
:::

::: warning Upload is not protected
`POST /api/sbom/upload` does not check for a session, even with authentication on. Keep `NEXT_PUBLIC_ENABLE_SBOM_UPLOAD` off on any instance others can reach, unless you protect the route another way.
:::

## Related

- [Run live scans](/guides/live-scans)
- [Security model](/security/)
- [Hardening checklist](/security/hardening)
