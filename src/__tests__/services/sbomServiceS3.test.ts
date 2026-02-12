import { S3SbomService } from "@/services/sbomStorageService/sbomServiceS3";


describe('S3SbomService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be instantiated without errors', () => {
    expect(() => {
      new S3SbomService('test-bucket', 'test-prefix/', 10);
    }).not.toThrow();
  });

  it('should handle constructor with default parameters', () => {
    const service = new S3SbomService('test-bucket');
    expect(service).toBeDefined();
  });

  // These tests are more about ensuring the methods exist and can be called
  // rather than testing the complex S3 integration
  it('should have listSboms method', () => {
    const service = new S3SbomService('test-bucket');
    expect(service.listSboms).toBeDefined();
  });

  it('should have getFileContent method', () => {
    const service = new S3SbomService('test-bucket');
    expect(service.getFileContent).toBeDefined();
  });

  it('should have saveFile method', () => {
    const service = new S3SbomService('test-bucket');
    expect(service.saveFile).toBeDefined();
  });
});