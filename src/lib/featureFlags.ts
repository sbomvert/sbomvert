/**
 * Feature flags configuration
 */

const runtimeEnv = (name: string) => process.env[name];

// Static build (next.config.js): no server, only the *.static.tsx routes exist.
const staticMode = () => process.env.NEXT_PUBLIC_STATIC_MODE === 'true';

export const FEATURE_FLAGS = {
  // the features below need a server: always off in the static build
  get ENABLE_SBOM_UPLOAD() {
    return !staticMode() && process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD === 'true';
  },
  // server-side only (see runtimeEnv)
  get ENABLE_SCAN_API() {
    return !staticMode() && runtimeEnv('NEXT_PUBLIC_ENABLE_SCAN_API') === 'true';
  },
  get CVE_MAPPING_ENABLED() {
    return process.env.NEXT_PUBLIC_CVE_MAPPING_ENABLED === 'true';
  },
  // Sign-in (better-auth + Postgres). Off: no login UI, /auth and /settings are 404, scans need no login.
  get ENABLE_AUTH() {
    return !staticMode() && process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';
  },
  get STATIC_MODE() {
    return staticMode();
  },
};

// Feature flags defined: ENABLE_SBOM_UPLOAD, ENABLE_SCAN_API, CVE_MAPPING_ENABLED, ENABLE_AUTH, STATIC_MODE
