# Scan worker: runs SBOM/CVE tools for the scan queue

FROM node:22-alpine

ARG SYFT_VERSION=v1.54.1
ARG GRYPE_VERSION=v0.120.1
ARG TRIVY_VERSION=v0.76.0

# docker-cli is only the client that runs the `docker scout` plugin; nothing talks to a daemon.
RUN apk add --no-cache curl docker-cli

# Install scripts come from the same release tag as the binary they install.
RUN curl -sSfL "https://raw.githubusercontent.com/anchore/syft/${SYFT_VERSION}/install.sh" \
      | sh -s -- -b /usr/local/bin "${SYFT_VERSION}" \
 && curl -sSfL "https://raw.githubusercontent.com/anchore/grype/${GRYPE_VERSION}/install.sh" \
      | sh -s -- -b /usr/local/bin "${GRYPE_VERSION}" \
 && curl -sSfL "https://raw.githubusercontent.com/aquasecurity/trivy/${TRIVY_VERSION}/contrib/install.sh" \
      | sh -s -- -b /usr/local/bin "${TRIVY_VERSION}"

# Docker Scout CLI plugin (needs DOCKER_SCOUT_HUB_USER / DOCKER_SCOUT_HUB_PASSWORD at runtime).
RUN mkdir -p /root/.docker \
 && curl -fsSL https://raw.githubusercontent.com/docker/scout-cli/main/install.sh -o /tmp/install-scout.sh \
 && sh /tmp/install-scout.sh && rm /tmp/install-scout.sh

# The only thing the worker caches: the vulnerability databases, at a fixed path for a volume.
ENV TRIVY_CACHE_DIR=/cache/dbs/trivy \
    GRYPE_DB_CACHE_DIR=/cache/dbs/grype

WORKDIR /app

# Only the worker workspace and what it uses (packages/core); not the Next.js app's dependencies.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY worker/package.json worker/
RUN npm ci --workspace @sbomvert/scan-worker --include-workspace-root=false --omit=dev --no-audit --no-fund

COPY packages/core packages/core
COPY worker worker

CMD ["npm", "run", "start", "-w", "@sbomvert/scan-worker"]
