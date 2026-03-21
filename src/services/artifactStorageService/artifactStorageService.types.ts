import crypto from 'crypto';

export type ArtifactKind = 'sbom' | 'cve';
export enum SubjectType {
  Container = 'container',
  Repository = 'repository',
  Other = 'other',
}

export interface SubjectRef {
  type: SubjectType;
  id: string; // e.g., image name, repo URL
}

export interface SubjectMetadata {
  id: string;                 // same as SubjectRef.id
  type: SubjectType;

  name: string;              // human-readable label

  createdAt: Date;
  updatedAt: Date;

  // optional but useful
  description?: string;
  tags?: string[];

  // future-proofing
  owner?: string;

  sboms: number;
  cves: number;
}

export interface BaseArtifactMetadata {
  id: string;

  subject: SubjectRef;

  kind: ArtifactKind;

  tool: string;
  toolVersion?: string;

  hash: string;
  hashAlgorithm: 'sha256';

  size: number;

  createdAt: Date;
  updatedAt?: Date;

  path: string;

  format?: string;
}

export interface SbomMetadata extends BaseArtifactMetadata {
  kind: 'sbom';

  source?: string; // optional original reference (image, repo commit, etc.)
}

export interface CveMetadata extends BaseArtifactMetadata {
  kind: 'cve';

  // lineage
  sbomTool: string;
  sbomHash: string;

  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export type ArtifactMetadata = SbomMetadata | CveMetadata;

export interface ArtifactFile {
  metadata: ArtifactMetadata;
  content?: string;
}

export interface SubjectArtifacts {
  subject: SubjectRef;

  artifacts: ArtifactMetadata[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface SubjectListResponse {
  subjects: SubjectMetadata[];
  pagination: PaginationInfo;
}

export abstract class IArtifactStorage {
  // Listing

  hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  abstract createSubject(subject: SubjectRef, metadata?: Partial<SubjectMetadata>): Promise<SubjectMetadata>;

  abstract getSubject(subject: SubjectRef): Promise<SubjectMetadata | null>;

  abstract listSubjects(page?: number, search?: string): Promise<SubjectListResponse>;

  abstract getSubjectArtifacts(subject: SubjectRef): Promise<SubjectArtifacts>;



  // SBOM
  abstract saveSBOM(
    subject: SubjectRef,
    tool: string,
    content: string,
    metadata?: Partial<SbomMetadata>
  ): Promise<ArtifactMetadata>;

  // CVE
  abstract saveCVE(
    subject: SubjectRef,
    sbomTool: string,
    scanner: string,
    content: string,
    metadata?: Partial<CveMetadata>
  ): Promise<ArtifactMetadata>;

  // Retrieval
  abstract getArtifactContent(artifactId: string): Promise<string>;

  // Queries
  abstract listArtifactsByType(
    subject: SubjectRef,
    kind: ArtifactKind
  ): Promise<ArtifactMetadata[]>;
}