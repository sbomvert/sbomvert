# Scan worker: runs SBOM/CVE tools for the scan queue

FROM node:22-alpine

ARG SYFT_VERSION=v1.54.1
ARG GRYPE_VERSION=v0.120.1
ARG TRIVY_VERSION=v0.76.0
ARG SBOMGEN_VERSION=1.17.7
ARG OSV_SCANNER_VERSION=v2.7.1
ARG CDXGEN_VERSION=v13.8.0

# docker-cli is only the client that runs the `docker scout` plugin; nothing talks to a daemon.
# skopeo downloads images to a file for osv-scanner and cdxgen.
RUN apk add --no-cache curl docker-cli skopeo

# Install scripts come from the same release tag as the binary they install.
RUN curl -sSfL "https://raw.githubusercontent.com/anchore/syft/${SYFT_VERSION}/install.sh" \
      | sh -s -- -b /usr/local/bin "${SYFT_VERSION}" \
 && curl -sSfL "https://raw.githubusercontent.com/anchore/grype/${GRYPE_VERSION}/install.sh" \
      | sh -s -- -b /usr/local/bin "${GRYPE_VERSION}" \
 && curl -sSfL "https://raw.githubusercontent.com/aquasecurity/trivy/${TRIVY_VERSION}/contrib/install.sh" \
      | sh -s -- -b /usr/local/bin "${TRIVY_VERSION}"

# Amazon Inspector SBOM generator: pulls images from the registry itself, needs no AWS credentials.
# the CPU the image is built for (amd64, arm64): a default TARGETARCH would win over the real one
RUN ARCH=$(uname -m | sed "s/x86_64/amd64/;s/aarch64/arm64/") \
 && curl -sSfL "https://amazon-inspector-sbomgen.s3.amazonaws.com/${SBOMGEN_VERSION}/linux/${ARCH}/inspector-sbomgen.zip" -o /tmp/sbomgen.zip \
 && unzip -j /tmp/sbomgen.zip "inspector-sbomgen-${SBOMGEN_VERSION}/linux/${ARCH}/inspector-sbomgen" -d /usr/local/bin \
 && chmod +x /usr/local/bin/inspector-sbomgen && rm /tmp/sbomgen.zip

# OSV-Scanner and cdxgen (cdxgen's musl build, for Alpine), checked against their published sha256.
RUN ARCH=$(uname -m | sed "s/x86_64/amd64/;s/aarch64/arm64/") \
 && curl -sSfL "https://github.com/google/osv-scanner/releases/download/${OSV_SCANNER_VERSION}/osv-scanner_linux_${ARCH}" -o /usr/local/bin/osv-scanner \
 && curl -sSfL "https://github.com/cdxgen/cdxgen/releases/download/${CDXGEN_VERSION}/cdxgen-linux-${ARCH}-musl" -o /usr/local/bin/cdxgen \
 && echo "$(curl -sSfL "https://github.com/cdxgen/cdxgen/releases/download/${CDXGEN_VERSION}/cdxgen-linux-${ARCH}-musl.sha256" | cut -d' ' -f1)  /usr/local/bin/cdxgen" | sha256sum -c - \
 && chmod +x /usr/local/bin/osv-scanner /usr/local/bin/cdxgen

# Docker Scout CLI plugin (needs DOCKER_SCOUT_HUB_USER / DOCKER_SCOUT_HUB_PASSWORD at runtime).
RUN mkdir -p /root/.docker \
 && curl -fsSL https://raw.githubusercontent.com/docker/scout-cli/main/install.sh -o /tmp/install-scout.sh \
 && sh /tmp/install-scout.sh && rm /tmp/install-scout.sh

# The only thing the worker caches: the vulnerability databases, at a fixed path for a volume.
ENV TRIVY_CACHE_DIR=/cache/dbs/trivy \
    GRYPE_DB_CACHE_DIR=/cache/dbs/grype

WORKDIR /app

# Only the worker workspace and what it uses (packages/core, packages/scan); not the Next.js app's dependencies.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/scan/package.json packages/scan/
COPY worker/package.json worker/
RUN npm ci --workspace @sbomvert/scan-worker --include-workspace-root=false --omit=dev --no-audit --no-fund

COPY packages/core packages/core
COPY packages/scan packages/scan
COPY worker worker

CMD ["npm", "run", "start", "-w", "@sbomvert/scan-worker"]
