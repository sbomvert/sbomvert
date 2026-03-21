import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import crypto from 'crypto';

import {
  IArtifactStorage,
  SubjectRef,
  SubjectMetadata,
  SubjectArtifacts,
  ArtifactMetadata,
  SbomMetadata,
  CveMetadata,
  ArtifactKind,
  SubjectListResponse,
  SubjectType,
  ArtifactNotFoundError,
  DuplicateArtifactError,
  SubjectAlreadyExistsError,
  SubjectNotFoundError,
} from './artifactStorageService.types';

// ─── S3 key layout ────────────────────────────────────────────────────────────
//
//  <prefix>subjects/<type>/<id>/subject.json
//  <prefix>subjects/<type>/<id>/sbom/<tool>/<isoTimestamp>.json
//  <prefix>subjects/<type>/<id>/sbom/<tool>/<isoTimestamp>.meta.json
//  <prefix>subjects/<type>/<id>/cves/<sbomTool>/<scanner>/<id>.json
//  <prefix>subjects/<type>/<id>/cves/<sbomTool>/<scanner>/<id>.meta.json
//  <prefix>index/<artifactId>.ptr.json

export class S3ArtifactStorage extends IArtifactStorage {
  private readonly s3: S3Client;

  constructor(
    private readonly bucket: string,
    private readonly prefix: string = 'artifacts/',
    s3Client?: S3Client
  ) {
    super();
    this.s3 = s3Client ?? this.defaultClient();
    // Normalise prefix: always ends with /
    if (!this.prefix.endsWith('/')) this.prefix += '/';
  }

  // ── S3 client factory ───────────────────────────────────────────────────────

  private defaultClient(): S3Client {
    return new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: process.env.S3_ENDPOINT
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
          }
        : undefined,
    });
  }

  // ── Key helpers ─────────────────────────────────────────────────────────────

  private k(...parts: string[]): string {
    return this.prefix + parts.join('/');
  }

  private subjectKey(subject: SubjectRef): string {
    return this.k('subjects', subject.type, subject.id, 'subject.json');
  }

  private sbomKey(subject: SubjectRef, tool: string, timestamp: string): string {
    return this.k('subjects', subject.type, subject.id, 'sbom', tool, `${timestamp}.json`);
  }

  private cveKey(
    subject: SubjectRef,
    sbomTool: string,
    scanner: string,
    id: string
  ): string {
    return this.k('subjects', subject.type, subject.id, 'cves', sbomTool, scanner, `${id}.json`);
  }

  private metaKey(key: string): string {
    return key.replace(/\.json$/, '.meta.json');
  }

  private indexKey(artifactId: string): string {
    return this.k('index', `${artifactId}.ptr.json`);
  }

  // ── S3 primitives ───────────────────────────────────────────────────────────

  private async getObject(key: string): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const resp = await this.s3.send(cmd);
    if (!resp.Body) throw new Error(`Empty body for key ${key}`);
    return streamToString(resp.Body as Readable);
  }

  private async putObject(key: string, body: string, contentType = 'application/json'): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  private async deleteObject(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private async keyExists(key: string): Promise<boolean> {
    try {
      await this.getObject(key);
      return true;
    } catch {
      return false;
    }
  }

  private async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;

    do {
      const params: ListObjectsV2CommandInput = {
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: token,
      };
      const resp = await this.s3.send(new ListObjectsV2Command(params));
      for (const obj of resp.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      token = resp.NextContinuationToken;
    } while (token);

    return keys;
  }

  // ── Artifact I/O ────────────────────────────────────────────────────────────

  private async writeArtifact(
    key: string,
    content: string,
    metadata: ArtifactMetadata
  ): Promise<void> {
    await this.putObject(key, content);
    await this.putObject(this.metaKey(key), JSON.stringify(metadata, null, 2));
    await this.putObject(
      this.indexKey(metadata.id),
      JSON.stringify({ key, kind: metadata.kind }, null, 2)
    );
  }

  private async readMeta(key: string): Promise<ArtifactMetadata | null> {
    try {
      return JSON.parse(await this.getObject(this.metaKey(key)));
    } catch {
      return null;
    }
  }

  private now(): string {
    return new Date().toISOString();
  }

  // ── Subject management ──────────────────────────────────────────────────────

  async createSubject(
    subject: SubjectRef,
    metadata: Omit<SubjectMetadata, 'sboms' | 'cves' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<SubjectMetadata, 'sboms' | 'cves' | 'createdAt' | 'updatedAt'>>
  ): Promise<SubjectMetadata> {
    const key = this.subjectKey(subject);
    if (await this.keyExists(key)) throw new SubjectAlreadyExistsError(subject);

    const now = new Date();
    const full: SubjectMetadata = {
      sboms: 0,
      cves: 0,
      createdAt: now,
      updatedAt: now,
      ...metadata,
      id: subject.id,
      type: subject.type,
    };
    await this.putObject(key, JSON.stringify(full, null, 2));
    return full;
  }

  async getSubject(subject: SubjectRef): Promise<SubjectMetadata | null> {
    try {
      return JSON.parse(await this.getObject(this.subjectKey(subject)));
    } catch {
      return null;
    }
  }

  async updateSubject(
    subject: SubjectRef,
    patch: Partial<Omit<SubjectMetadata, 'id' | 'type' | 'createdAt'>>
  ): Promise<SubjectMetadata> {
    const existing = await this.getSubject(subject);
    if (!existing) throw new SubjectNotFoundError(subject);
    const updated: SubjectMetadata = {
      ...existing,
      ...patch,
      id: existing.id,
      type: existing.type,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    await this.putObject(this.subjectKey(subject), JSON.stringify(updated, null, 2));
    return updated;
  }

  async listSubjects(page = 1, search = ''): Promise<SubjectListResponse> {
    const prefix = this.k('subjects') + '/';
    const allKeys = await this.listKeys(prefix);

    // Filter for subject.json sentinel files
    const subjectKeys = allKeys.filter((k) => k.endsWith('/subject.json'));

    const all: SubjectMetadata[] = [];
    for (const key of subjectKeys) {
      try {
        const meta: SubjectMetadata = JSON.parse(await this.getObject(key));
        if (search && !meta.id.toLowerCase().includes(search.toLowerCase())) continue;
        all.push(meta);
      } catch {
        // skip corrupt entries
      }
    }

    const itemsPerPage = 20;
    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    return {
      subjects: all.slice((page - 1) * itemsPerPage, page * itemsPerPage),
      pagination: { currentPage: page, totalPages, totalItems, itemsPerPage },
    };
  }

  // ── Artifact queries ────────────────────────────────────────────────────────

  async getSubjectArtifacts(subject: SubjectRef): Promise<SubjectArtifacts> {
    const prefix = this.k('subjects', subject.type, subject.id) + '/';
    const allKeys = await this.listKeys(prefix);

    const artifactKeys = allKeys.filter(
      (k) => k.endsWith('.json') && !k.endsWith('.meta.json') && !k.endsWith('subject.json')
    );

    const artifacts: ArtifactMetadata[] = [];
    for (const key of artifactKeys) {
      const meta = await this.readMeta(key);
      if (meta) artifacts.push(meta);
    }
    return { subject, artifacts };
  }

  async listArtifactsByKind(
    subject: SubjectRef,
    kind: ArtifactKind
  ): Promise<ArtifactMetadata[]> {
    const { artifacts } = await this.getSubjectArtifacts(subject);
    return artifacts.filter((a) => a.kind === kind);
  }

  private async resolveArtifactKey(artifactId: string): Promise<string> {
    // Fast path via index
    try {
      const ptr = JSON.parse(await this.getObject(this.indexKey(artifactId)));
      if (ptr?.key) return ptr.key as string;
    } catch {
      // fall through
    }
    throw new ArtifactNotFoundError(artifactId);
  }

  async getArtifactContent(artifactId: string): Promise<string> {
    const key = await this.resolveArtifactKey(artifactId);
    return this.getObject(key);
  }

  async getArtifactMetadata(artifactId: string): Promise<ArtifactMetadata> {
    const key = await this.resolveArtifactKey(artifactId);
    const meta = await this.readMeta(key);
    if (!meta) throw new ArtifactNotFoundError(artifactId);
    return meta;
  }

  async deleteArtifact(artifactId: string): Promise<void> {
    const key = await this.resolveArtifactKey(artifactId);
    const meta = await this.readMeta(key);
    if (!meta) throw new ArtifactNotFoundError(artifactId);

    await this.deleteObject(key);
    await this.deleteObject(this.metaKey(key));
    await this.deleteObject(this.indexKey(artifactId));

    // Decrement subject counter
    const subject = await this.getSubject(meta.subject);
    if (subject) {
      await this.updateSubject(meta.subject, {
        [meta.kind === 'sbom' ? 'sboms' : 'cves']: Math.max(
          0,
          (meta.kind === 'sbom' ? subject.sboms : subject.cves) - 1
        ),
      });
    }
  }

  // ── SBOM ────────────────────────────────────────────────────────────────────

  async saveSBOM(
    subject: SubjectRef,
    tool: string,
    content: string,
    extra: Partial<Omit<SbomMetadata, 'id' | 'kind' | 'subject' | 'tool' | 'hash' | 'hashAlgorithm' | 'size' | 'createdAt' | 'path'>> = {}
  ): Promise<SbomMetadata> {
    const existingSubject = await this.getSubject(subject);
    if (!existingSubject) {
      await this.createSubject(subject, { id: subject.id, type: subject.type, name: subject.id });
    }

    const timestamp = this.now();
    const hash = this.hash(content);
    const id = crypto.randomUUID();
    const key = this.sbomKey(subject, tool, timestamp);

    const meta: SbomMetadata = {
      id,
      subject,
      kind: 'sbom',
      tool,
      hash,
      hashAlgorithm: 'sha256',
      size: Buffer.byteLength(content, 'utf-8'),
      createdAt: new Date(timestamp),
      path: key,
      ...extra,
    };

    await this.writeArtifact(key, content, meta);
    await this.updateSubject(subject, {
      sboms: ((await this.getSubject(subject))?.sboms ?? 0) + 1,
    });

    return meta;
  }

  // ── CVE ─────────────────────────────────────────────────────────────────────

  async saveCVE(
    subject: SubjectRef,
    sbomTool: string,
    scanner: string,
    content: string,
    extra: Partial<Omit<CveMetadata, 'id' | 'kind' | 'subject' | 'tool' | 'sbomTool' | 'hash' | 'hashAlgorithm' | 'size' | 'createdAt' | 'path'>> = {}
  ): Promise<CveMetadata> {
    const existingSubject = await this.getSubject(subject);
    if (!existingSubject) {
      await this.createSubject(subject, { id: subject.id, type: subject.type, name: subject.id });
    }

    const timestamp = this.now();
    const hash = this.hash(content);
    const id = crypto
      .createHash('sha256')
      .update(`${subject.type}:${subject.id}:${sbomTool}:${scanner}`)
      .digest('hex')
      .slice(0, 16);

    const key = this.cveKey(subject, sbomTool, scanner, id);
    if (await this.keyExists(key)) {
      throw new DuplicateArtifactError(
        `CVE report for ${subject.id} / ${sbomTool} / ${scanner} already exists`
      );
    }

    const meta: CveMetadata = {
      id,
      subject,
      kind: 'cve',
      tool: scanner,
      sbomTool,
      sbomHash: extra.sbomHash ?? '',
      hash,
      hashAlgorithm: 'sha256',
      size: Buffer.byteLength(content, 'utf-8'),
      createdAt: new Date(timestamp),
      path: key,
      ...extra,
    };

    await this.writeArtifact(key, content, meta);
    await this.updateSubject(subject, {
      cves: ((await this.getSubject(subject))?.cves ?? 0) + 1,
    });

    return meta;
  }
}

// ─── Stream helper ────────────────────────────────────────────────────────────

async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', reject);
  });
}