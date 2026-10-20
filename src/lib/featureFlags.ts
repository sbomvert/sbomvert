/**
 * Feature flags configuration
 */
export const FEATURE_FLAGS = {
  get ENABLE_SBOM_UPLOAD() {
    return process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD === 'true';
  },
  get ENABLE_SCAN_API() {
    return process.env.NEXT_PUBLIC_ENABLE_SCAN_API === 'true';
  },
  get CVE_MAPPING_ENABLED() {
    return process.env.NEXT_PUBLIC_CVE_MAPPING_ENABLED === 'true';
  },
  // Sign-in (better-auth + Postgres). Off: no login UI, /auth and /settings are 404, scans need no login.
  get ENABLE_AUTH() {
    return process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';
  },
};

// Feature flags defined: ENABLE_SBOM_UPLOAD, ENABLE_SCAN_API, CVE_MAPPING_ENABLED, ENABLE_AUTH
