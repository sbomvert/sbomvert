/**
 * Feature flags configuration
 */
export const FEATURE_FLAGS = {
  get ENABLE_SBOM_UPLOAD() {
    return process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD === 'true';
  },
};
