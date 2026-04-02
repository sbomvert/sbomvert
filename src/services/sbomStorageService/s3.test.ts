import { Readable } from 'stream';
import { S3SbomService } from './sbomServiceS3';

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


describe('S3SbomService', () => {
  let service: S3SbomService;

  beforeEach(() => {
    sendMock.mockReset();
    service = new S3SbomService('bucket', 'sbom/', 2);
  });

  describe('listSboms', () => {
    it('groups objects by container', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'sbom/img1/a.json', Size: 10, LastModified: new Date() },
          { Key: 'sbom/img2/b.json', Size: 20, LastModified: new Date() },
        ],
      });

      const res = await service.listSboms(1);

      expect(res.containers).toHaveLength(2);
      expect(res.containers[0].name).toBe('img1');
      expect(res.containers[1].name).toBe('img2');
    });

    it('filters non-json files', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'sbom/img1/a.json' },
          { Key: 'sbom/img1/a.txt' }, // should be ignored
        ],
      });

      const res = await service.listSboms(1);

      expect(res.containers[0].files).toHaveLength(1);
    });

    it('supports pagination', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'sbom/a/file.json' },
          { Key: 'sbom/b/file.json' },
          { Key: 'sbom/c/file.json' },
        ],
      });

      const res = await service.listSboms(1);

      expect(res.pagination.totalItems).toBe(3);
      expect(res.pagination.totalPages).toBe(2);
    });

    it('filters by search', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'sbom/test/file.json' },
          { Key: 'sbom/other/file.json' },
        ],
      });

      const res = await service.listSboms(1, 'test');

      expect(res.containers).toHaveLength(1);
      expect(res.containers[0].name).toBe('test');
    });

    it('handles S3 errors', async () => {
      sendMock.mockRejectedValueOnce(new Error('fail'));

      const res = await service.listSboms();

      expect(res.containers).toEqual([]);
      expect(res.pagination.totalItems).toBe(0);
    });
  });

  describe('listFiles', () => {
    it('returns files for container', async () => {
      sendMock.mockResolvedValueOnce({
        Contents: [
          { Key: 'sbom/img1/a.json', Size: 1, LastModified: new Date() },
        ],
      });

      const files = await service.listFiles('img1');

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('a.json');
    });

    it('returns empty for missing container', async () => {
      sendMock.mockResolvedValueOnce({ Contents: [] });

      const files = await service.listFiles('missing');

      expect(files).toEqual([]);
    });

    it('returns empty for empty containerName', async () => {
      const files = await service.listFiles('');

      expect(files).toEqual([]);
    });
  });

  describe('getFileContent', () => {
    it('reads stream content', async () => {
      const stream = Readable.from(['sbom-data']);

      sendMock.mockResolvedValueOnce({
        Body: stream,
      });

      const res = await service.getFileContent('img1', 'a.json');

      expect(res).toBe('sbom-data');
    });

    it('throws if body missing', async () => {
      sendMock.mockResolvedValueOnce({});

      await expect(
        service.getFileContent('img1', 'a.json')
      ).rejects.toThrow('SBOM file not found');
    });

    it('handles S3 errors', async () => {
      sendMock.mockRejectedValueOnce(new Error('fail'));

      await expect(
        service.getFileContent('img1', 'a.json')
      ).rejects.toThrow('SBOM file not found');
    });
  });

  describe('saveSBOM', () => {
    it('writes correct key', async () => {
      sendMock.mockResolvedValueOnce({});

      await service.saveSBOM('img1', 'scan', 'syft', '{}');

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'bucket',
            Key: 'sbom/img1/syft.scan.json',
            Body: '{}',
            ContentType: 'application/json',
          }),
        })
      );
    });
  });

  describe('saveFile (wrapper)', () => {
    it('delegates correctly', async () => {
      sendMock.mockResolvedValueOnce({});

      await service.saveFile('img1/syft.scan.json', '{}');

      expect(sendMock).toHaveBeenCalled();
    });
  });

  describe('getFileUrl', () => {
    it('generates correct URL', () => {
      const url = service.getFileUrl('img1', 'file.json');

      expect(url).toBe('s3://bucket/sbom/img1/file.json');
    });
  });

  describe('pagination loop', () => {
    it('handles continuation tokens', async () => {
      sendMock
        .mockResolvedValueOnce({
          Contents: [{ Key: 'sbom/a/1.json' }],
          NextContinuationToken: 'token',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'sbom/b/2.json' }],
        });

      const res = await service.listSboms();

      expect(res.pagination.totalItems).toBe(2);
    });
  });
});