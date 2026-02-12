import { FEATURE_FLAGS } from '@/lib/featureFlags';

// Mock the process.env for testing different scenarios
describe('Feature Flags', () => {
  beforeEach(() => {
    // Clear all environment variables before each test
    delete process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD;
  });

  it('should disable SBOM upload when NEXT_PUBLIC_ENABLE_SBOM_UPLOAD is not set', () => {
    expect(FEATURE_FLAGS.ENABLE_SBOM_UPLOAD).toBe(false);
  });

  it('should enable SBOM upload when NEXT_PUBLIC_ENABLE_SBOM_UPLOAD is "true"', () => {
    process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD = 'true';
    expect(FEATURE_FLAGS.ENABLE_SBOM_UPLOAD).toBe(true);
  });

  it('should disable SBOM upload when NEXT_PUBLIC_ENABLE_SBOM_UPLOAD is set to "false"', () => {
    process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD = 'false';
    expect(FEATURE_FLAGS.ENABLE_SBOM_UPLOAD).toBe(false);
  });

  it('should disable SBOM upload when NEXT_PUBLIC_ENABLE_SBOM_UPLOAD is set to any other value', () => {
    process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD = 'maybe';
    expect(FEATURE_FLAGS.ENABLE_SBOM_UPLOAD).toBe(false);

    process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD = '1';
    expect(FEATURE_FLAGS.ENABLE_SBOM_UPLOAD).toBe(false);

    process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD = '';
    expect(FEATURE_FLAGS.ENABLE_SBOM_UPLOAD).toBe(false);
  });
});
