import { IArtifactStorage } from './artifactStorageService.types';
import { LocalArtifactStorage } from './localArtifactStorageService';
import { S3ArtifactStorage } from './s3ArtifactStorageService';


function createArtifactStorage(): IArtifactStorage {
  if (process.env.NODE_ENV === 'production' || process.env.USE_S3 === 'true') {
    const bucket = process.env.S3_BUCKET ?? 'sbomvert';
    const prefix = process.env.S3_PREFIX ?? 'artifacts/';
    return new S3ArtifactStorage(bucket, prefix);
  }

  const root = process.env.ARTIFACT_ROOT ?? './public';
  return new LocalArtifactStorage(root);
}

export const artifactStorage: IArtifactStorage = createArtifactStorage();