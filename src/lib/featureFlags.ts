/**
 * Feature flags configuration
 */
export const FEATURE_FLAGS = {
  ENABLE_SBOM_UPLOAD: process.env.ENABLE_SBOM_UPLOAD === 'enabled',
};
