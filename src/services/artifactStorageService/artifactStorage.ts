// lib/artifactService.ts
import { LocalArtifactStorage } from './localArtifactStorageService';

export const artifactService = new LocalArtifactStorage(
  process.env.ARTIFACT_ROOT || './public'
);