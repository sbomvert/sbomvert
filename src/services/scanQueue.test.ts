import { createScanQueue, createScanWorker } from './scanQueue';

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      quit: jest.fn(),
    })),
  };
});

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn(function (name: string, opts: any) {
      this.name = name;
      this.opts = opts;
    }),
    Worker: jest.fn(function (name: string, processor: any, opts: any) {
      this.name = name;
      this.processor = processor;
      this.opts = opts;
    }),
    Job: jest.fn(),
  };
});

// Mock all storage and service dependencies to prevent side effects
jest.mock('./storage', () => ({
  saveRawSbom: jest.fn(),
  saveCombinedSbom: jest.fn(),
  saveMergedCveReport: jest.fn(),
  saveJobStatus: jest.fn(),
}));

jest.mock('@/services/sbomStorageService/sbomStorageService', () => ({
  default: { saveSBOM: jest.fn() },
}));

jest.mock('./cveStorageService/cveStorageService', () => ({
  default: { saveCVEFile: jest.fn() },
}));

jest.mock('@/lib/sbom/generator', () => ({
  GenerateSPDXSBOMwithTool: jest.fn(() => 'echo "{}"'),
}));

jest.mock('@/lib/utils', () => ({
  SanitizeContainerImage: jest.fn((img) => img),
}));

jest.mock('@/lib/vuln/scanner', () => ({
  ScanSPDXwithTool: jest.fn(() => 'echo "[]"'),
}));

jest.mock('@/lib/vuln/vulnutils', () => ({
  VULN_EXTRACTORS: { echo: () => [] },
}));

describe('scanQueue module', () => {
  test('createScanQueue returns a Queue with name "scan"', () => {
    const queue = createScanQueue();
    // @ts-ignore – using mocked Queue class
    expect(queue.name).toBe('scan');
  });

  test('createScanWorker returns a Worker configured for the "scan" queue', () => {
    const worker = createScanWorker();
    // @ts-ignore – using mocked Worker class
    expect(worker.name).toBe('scan');
    // Processor should be a function
    expect(worker.opts.concurrency).toBeDefined();
  });
});
