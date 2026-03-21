import crypto from 'crypto';

// ─── Enums & primitives ───────────────────────────────────────────────────────

export type ArtifactKind = 'sbom' | 'cve';

export enum SubjectType {
  Container = 'container',
  Repository = 'repository',
  Other = 'other',
}

// Zod-friendly tuple – keep in sync with the enum above
export const SUBJECT_TYPES = ['container', 'repository', 'other'] as const;
export type SubjectTypeValue = (typeof SUBJECT_TYPES)[number];

// ─── Subject ──────────────────────────────────────────────────────────────────

export interface SubjectRef {
  type: SubjectType;
  id: string;
}

export interface SubjectMetadata {
  id: string;
  type: SubjectType;

  name: string;
  description?: string;
  tags?: string[];
  owner?: string;

  sboms: number;
  cves: number;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Artifact metadata ────────────────────────────────────────────────────────

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

  /** Relative path from the storage root */
  path: string;

  format?: string;
}

export interface SbomMetadata extends BaseArtifactMetadata {
  kind: 'sbom';
  /** Original reference (image digest, repo commit, etc.) */
  source?: string;
}

export interface CveMetadata extends BaseArtifactMetadata {
  kind: 'cve';

  /** Tool that produced the SBOM this scan was run against */
  sbomTool: string;
  /** Hash of the source SBOM for lineage */
  sbomHash: string;

  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
}

export type ArtifactMetadata = SbomMetadata | CveMetadata;

// ─── Compound responses ───────────────────────────────────────────────────────

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

// ─── Storage errors ───────────────────────────────────────────────────────────

export class SubjectNotFoundError extends Error {
  constructor(subject: SubjectRef) {
    super(`Subject not found: ${subject.type}/${subject.id}`);
    this.name = 'SubjectNotFoundError';
  }
}

export class ArtifactNotFoundError extends Error {
  constructor(id: string) {
    super(`Artifact not found: ${id}`);
    this.name = 'ArtifactNotFoundError';
  }
}

export class DuplicateArtifactError extends Error {
  constructor(detail?: string) {
    super(`Duplicate artifact${detail ? `: ${detail}` : ''}`);
    this.name = 'DuplicateArtifactError';
  }
}

export class SubjectAlreadyExistsError extends Error {
  constructor(subject: SubjectRef) {
    super(`Subject already exists: ${subject.type}/${subject.id}`);
    this.name = 'SubjectAlreadyExistsError';
  }
}

// ─── Abstract storage interface ───────────────────────────────────────────────

export abstract class IArtifactStorage {
  // ── Utility ────────────────────────────────────────────────────────────────

  hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // ── Subject management ─────────────────────────────────────────────────────

  abstract createSubject(
    subject: SubjectRef,
    metadata: Omit<SubjectMetadata, 'sboms' | 'cves' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<SubjectMetadata, 'sboms' | 'cves' | 'createdAt' | 'updatedAt'>>
  ): Promise<SubjectMetadata>;

  abstract getSubject(subject: SubjectRef): Promise<SubjectMetadata | null>;

  abstract updateSubject(
    subject: SubjectRef,
    patch: Partial<Omit<SubjectMetadata, 'id' | 'type' | 'createdAt'>>
  ): Promise<SubjectMetadata>;

  abstract listSubjects(page?: number, search?: string): Promise<SubjectListResponse>;

  // ── Artifact queries ───────────────────────────────────────────────────────

  abstract getSubjectArtifacts(subject: SubjectRef): Promise<SubjectArtifacts>;

  abstract listArtifactsByKind(
    subject: SubjectRef,
    kind: ArtifactKind
  ): Promise<ArtifactMetadata[]>;

  abstract getArtifactContent(artifactId: string): Promise<string>;

  abstract getArtifactMetadata(artifactId: string): Promise<ArtifactMetadata>;

  abstract deleteArtifact(artifactId: string): Promise<void>;

  // ── SBOM ───────────────────────────────────────────────────────────────────

  abstract saveSBOM(
    subject: SubjectRef,
    tool: string,
    content: string,
    metadata?: Partial<Omit<SbomMetadata, 'id' | 'kind' | 'subject' | 'tool' | 'hash' | 'hashAlgorithm' | 'size' | 'createdAt' | 'path'>>
  ): Promise<SbomMetadata>;

  // ── CVE ────────────────────────────────────────────────────────────────────

  abstract saveCVE(
    subject: SubjectRef,
    sbomTool: string,
    scanner: string,
    content: string,
    metadata?: Partial<Omit<CveMetadata, 'id' | 'kind' | 'subject' | 'tool' | 'sbomTool' | 'hash' | 'hashAlgorithm' | 'size' | 'createdAt' | 'path'>>
  ): Promise<CveMetadata>;
}