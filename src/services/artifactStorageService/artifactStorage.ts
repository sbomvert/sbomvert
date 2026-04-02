import { IArtifactStorage } from './artifactStorageService.types';
import { LocalArtifactStorage } from './localArtifactStorageService';
import { S3ArtifactStorage } from './s3ArtifactStorageService';


let artifactService: IArtifactStorage;

  // Choose backend based on ARTIFACT_BACKEND_TYPE env var ('local' or 's3')
  // Defaults to 'local' if not set or invalid.
  if (process.env.ARTIFACT_BACKEND_TYPE === 's3') {
    const bucket = process.env.S3_BUCKET ?? 'sbomvert';
    const prefix = process.env.S3_PREFIX ?? 'artifacts/';
    artifactService = new S3ArtifactStorage(bucket, prefix);
  } else {
    const root = process.env.ARTIFACT_ROOT ?? './public';
    artifactService = new LocalArtifactStorage(root);
  }




export default artifactService