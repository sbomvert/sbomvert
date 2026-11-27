# Scan worker: runs SBOM/CVE tools for the scan queue

FROM node:22-alpine

ARG SYFT_VERSION=v1.54.1
ARG GRYPE_VERSION=v0.120.1
ARG TRIVY_VERSION=v0.76.0
ARG SBOMGEN_VERSION=1.17.7
ARG OSV_SCANNER_VERSION=v2.7.1
ARG CDXGEN_VERSION=v13.8.0
ARG SCOUT_VERSION=1.30.0

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

# Docker Scout CLI plugin, from its release archive and checked against the release's sha256 list.
# Needs DOCKER_SCOUT_HUB_USER / DOCKER_SCOUT_HUB_PASSWORD at runtime.
RUN ARCH=$(uname -m | sed "s/x86_64/amd64/;s/aarch64/arm64/") \
 && mkdir -p /root/.docker/cli-plugins \
 && cd /tmp \
 && curl -sSfL "https://github.com/docker/scout-cli/releases/download/v${SCOUT_VERSION}/docker-scout_${SCOUT_VERSION}_checksums.txt" -o checksums.txt \
 && curl -sSfL "https://github.com/docker/scout-cli/releases/download/v${SCOUT_VERSION}/docker-scout_${SCOUT_VERSION}_linux_${ARCH}.tar.gz" -o scout.tar.gz \
 && grep "linux_${ARCH}.tar.gz" checksums.txt | sed "s#docker-scout_${SCOUT_VERSION}_linux_${ARCH}.tar.gz#scout.tar.gz#" | sha256sum -c - \
 && tar -xzf scout.tar.gz -C /root/.docker/cli-plugins docker-scout \
 && chmod +x /root/.docker/cli-plugins/docker-scout && rm /tmp/checksums.txt /tmp/scout.tar.gz

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
