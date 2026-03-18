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
  }
};
