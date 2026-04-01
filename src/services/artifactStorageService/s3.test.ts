import { Readable } from 'stream';
import { S3ArtifactStorage } from './s3ArtifactStorageService';
import { SubjectRef, SubjectType } from './artifactStorageService.types';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: sendMock })),
  GetObjectCommand: jest.fn((input) => ({ input })),
  PutObjectCommand: jest.fn((input) => ({ input })),
  DeleteObjectCommand: jest.fn((input) => ({ input })),
  ListObjectsV2Command: jest.fn((input) => ({ input })),
}));

describe('S3ArtifactStorage - subjects', () => {
  let storage: S3ArtifactStorage;

  const subject:SubjectRef = { type: SubjectType.Container, id: 'nginx:latest' };

  beforeEach(() => {
    sendMock.mockReset();
    storage = new S3ArtifactStorage('bucket', 'artifacts/');
  });

  it('creates a subject', async () => {
    // keyExists → false
    sendMock.mockRejectedValueOnce(new Error('not found'));

    // putObject
    sendMock.mockResolvedValue({});

    const result = await storage.createSubject(subject, {
      name: 'nginx',
      id: subject.id,
      type: subject.type,
    });

    expect(result.id).toBe(subject.id);
    expect(sendMock).toHaveBeenCalled();
  });

  it('throws if subject already exists', async () => {
    sendMock.mockResolvedValueOnce({
      Body: Readable.from(['{}']),
    });

    await expect(
      storage.createSubject(subject, { name: 'nginx', id: subject.id, type: subject.type })
    ).rejects.toThrow('Subject already exists: container/nginx:latest');
  });

  it('gets subject', async () => {
    sendMock.mockResolvedValueOnce({
      Body: Readable.from([JSON.stringify({ id: subject.id })]),
    });

    const res = await storage.getSubject(subject);

    expect(res?.id).toBe(subject.id);
  });
});
