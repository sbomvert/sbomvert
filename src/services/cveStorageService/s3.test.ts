import { Readable } from 'stream';
import { S3CVEService } from './cveStorageServiceS3';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(() => ({
      send: sendMock,
    })),
    ListObjectsV2Command: jest.fn((input) => ({ input })),
    GetObjectCommand: jest.fn((input) => ({ input })),
    PutObjectCommand: jest.fn((input) => ({ input })),
  };
});


describe('S3CVEService', () => {
  let service: S3CVEService;

  beforeEach(() => {
    sendMock.mockReset();
    service = new S3CVEService('test-bucket', 'cves/', 2);
  });

  describe('listSboms', () => {
    it('should list and group objects by container', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          {
            Key: 'cves/img1/file1.json',
            Size: 10,
            LastModified: new Date(),
          },
          {
            Key: 'cves/img2/file2.json',
            Size: 20,
            LastModified: new Date(),
          },
        ],
      });

      const result = await service.listSboms(1);

      expect(result.containers).toHaveLength(2);
      expect(result.containers[0].name).toBe('img1');
      expect(result.containers[1].name).toBe('img2');
    });

    it('should paginate results', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'cves/a/file.json' },
          { Key: 'cves/b/file.json' },
          { Key: 'cves/c/file.json' },
        ],
      });

      const result = await service.listSboms(1);

      expect(result.pagination.totalItems).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.containers).toHaveLength(2);
    });

    it('should filter by search', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'cves/test-img/file.json' },
          { Key: 'cves/other/file.json' },
        ],
      });

      const result = await service.listSboms(1, 'test');

      expect(result.containers).toHaveLength(1);
      expect(result.containers[0].name).toBe('test-img');
    });

    it('should handle S3 errors gracefully', async () => {
      sendMock.mockRejectedValueOnce(new Error('S3 down'));

      const result = await service.listSboms(1);

      expect(result.containers).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
    });
  });

  describe('listCVEFiles', () => {
    it('should return files for a container', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'cves/img1/file1.json', Size: 10, LastModified: new Date() },
        ],
      });

      const files = await service.listCVEFiles('img1');

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('file1.json');
    });

    it('should return empty array for missing container', async () => {
      sendMock.mockResolvedValueOnce({ Contents: [] });

      const files = await service.listCVEFiles('missing');

      expect(files).toEqual([]);
    });
  });

  describe('getFileContent', () => {
    it('should read file content from stream', async () => {
      const stream = Readable.from(['hello world']);

      sendMock.mockResolvedValueOnce({
        Body: stream,
      });

      const result = await service.getFileContent('img1', 'file.json');

      expect(result).toBe('hello world');
    });

    it('should throw on missing body', async () => {
      sendMock.mockResolvedValueOnce({});

      await expect(
        service.getFileContent('img1', 'file.json')
      ).rejects.toThrow('CVE file not found');
    });

    it('should handle S3 errors', async () => {
      sendMock.mockRejectedValueOnce(new Error('fail'));

      await expect(
        service.getFileContent('img1', 'file.json')
      ).rejects.toThrow('CVE file not found');
    });
  });

  describe('saveCVEFile', () => {
    it('should send PutObjectCommand with correct params', async () => {
      sendMock.mockResolvedValueOnce({});

      await service.saveCVEFile('img1', 'scan', 'trivy', '{"ok":true}');

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'cves/img1/trivy.scan.json',
            Body: '{"ok":true}',
            ContentType: 'application/json',
          }),
        })
      );
    });
  });

  describe('saveFile (deprecated wrapper)', () => {
    it('should delegate to saveCVEFile', async () => {
      sendMock.mockResolvedValueOnce({});

      await service.saveFile('img1/trivy.scan.json', '{}');

      expect(sendMock).toHaveBeenCalled();
    });
  });

  describe('getFileUrl', () => {
    it('should generate correct S3 URL', () => {
      const url = service.getFileUrl('img1', 'file.json');

      expect(url).toBe('s3://test-bucket/cves/img1/file.json');
    });
  });

  describe('pagination loop', () => {
    it('should handle multiple pages (continuation token)', async () => {
      sendMock
        .mockResolvedValueOnce({
          Contents: [{ Key: 'cves/a/file.json' }],
          NextContinuationToken: 'token1',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'cves/b/file.json' }],
        });

      const result = await service.listSboms(1);

      expect(result.pagination.totalItems).toBe(2);
    });
  });
});