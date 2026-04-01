import { promises as fs } from 'fs';
import { join } from 'path';
import os from 'os';
import { saveRawSbom, saveCombinedSbom, saveToolCveReport, saveMergedCveReport, saveJobStatus, JobLogEntry, getJobStatus } from './storage';


describe('Storage layer', () => {
  let tmpDir: string;
beforeEach(async () => {
  await fs.rm(join(tmpDir, 'storage'), { recursive: true, force: true });
});
  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(join(os.tmpdir(), 'storage-test-'));
    jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('SBOM persistence', () => {
    it('should save raw SBOM', async () => {
      const data = { foo: 'bar' };
      const path = await saveRawSbom('job1', 'syft', data);

      const content = JSON.parse(await fs.readFile(path, 'utf8'));

      expect(content).toEqual(data);
      expect(path).toContain('sboms/job1/syft.json');
    });

    it('should save combined SBOM', async () => {
      const data = { merged: true };
      const path = await saveCombinedSbom('job1', data);

      const content = JSON.parse(await fs.readFile(path, 'utf8'));

      expect(content).toEqual(data);
      expect(path).toContain('sboms/job1/combined.json');
    });
  });

  describe('CVE persistence', () => {
    it('should save tool CVE report', async () => {
      const report = { vulns: [] };
      const path = await saveToolCveReport('job1', 'trivy', report);

      const content = JSON.parse(await fs.readFile(path, 'utf8'));

      expect(content).toEqual(report);
      expect(path).toContain('cves/job1/trivy.json');
    });

    it('should save merged CVE report', async () => {
      const report = { merged: true };
      const path = await saveMergedCveReport('job1', report);

      const content = JSON.parse(await fs.readFile(path, 'utf8'));

      expect(content).toEqual(report);
      expect(path).toContain('cves/job1/merged.json');
    });
  });

  describe('Job status lifecycle', () => {
    it('should create a new job status file', async () => {
      const path = await saveJobStatus('jobA', 'pending');

      const content = JSON.parse(await fs.readFile(path, 'utf8'));

      expect(content.status).toBe('pending');
      expect(content.history).toEqual([]);
      expect(content.updatedAt).toBeDefined();
    });

    it('should append history entries', async () => {
      const entry1: JobLogEntry = { level: 'info', message: 'start' };
      const entry2: JobLogEntry = { level: 'error', message: 'fail' };

      await saveJobStatus('jobB', 'running', entry1);
      await saveJobStatus('jobB', 'failed', entry2);

      const result = await getJobStatus('jobB');

      expect(result.status).toBe('failed');
      expect(result.history).toHaveLength(2);
      expect(result.history[0]).toEqual(entry1);
      expect(result.history[1]).toEqual(entry2);
    });

    it('should preserve history when no new entry is provided', async () => {
      const entry: JobLogEntry = { level: 'info', message: 'init' };

      await saveJobStatus('jobC', 'running', entry);
      await saveJobStatus('jobC', 'completed');

      const result = await getJobStatus('jobC');

      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toEqual(entry);
    });

    it('should handle missing previous file (ENOENT)', async () => {
      const resultPath = await saveJobStatus('nonexistent', 'new');

      const content = JSON.parse(await fs.readFile(resultPath, 'utf8'));

      expect(content.history).toEqual([]);
      expect(content.status).toBe('new');
    });
  });

  describe('getJobStatus', () => {
    it('should read and parse job status correctly', async () => {
      const entry: JobLogEntry = { level: 'info', message: 'ok' };

      await saveJobStatus('jobD', 'done', entry);

      const result = await getJobStatus('jobD');

      expect(result.status).toBe('done');
      expect(result.history).toEqual([entry]);
    });

    it('should throw if file does not exist', async () => {
      await expect(getJobStatus('missing-job')).rejects.toThrow();
    });
  });
});