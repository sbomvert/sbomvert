import fs from 'fs/promises';
import path from 'path';
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

// ─── On-disk layout ───────────────────────────────────────────────────────────
//
//  <root>/subjects/<type>/<id>/
//    subject.json                        ← SubjectMetadata
//    sbom/<tool>/<isoTimestamp>.json      ← SBOM content
//    sbom/<tool>/<isoTimestamp>.meta.json ← SbomMetadata
//    cves/<sbomTool>/<scanner>/<id>.json
//    cves/<sbomTool>/<scanner>/<id>.meta.json
//  <root>/index/
//    <artifactId>.ptr.json               ← {filePath, kind} for O(1) lookup

export class LocalArtifactStorage extends IArtifactStorage {
  constructor(private readonly rootDir: string) {
    super();
  }

  // ── Path helpers ────────────────────────────────────────────────────────────

  private subjectsBase(): string {
    return path.join(this.rootDir, 'subjects');
  }

  private indexBase(): string {
    return path.join(this.rootDir, 'index');
  }

  private subjectDir(subject: SubjectRef): string {
    return path.join(this.subjectsBase(), subject.type, subject.id);
  }

  private subjectMetaPath(subject: SubjectRef): string {
    return path.join(this.subjectDir(subject), 'subject.json');
  }

  private sbomPath(subject: SubjectRef, tool: string, timestamp: string): string {
    return path.join(this.subjectDir(subject), 'sbom', tool, `${timestamp}.json`);
  }

  private cvePath(
    subject: SubjectRef,
    sbomTool: string,
    scanner: string,
    id: string
  ): string {
    return path.join(this.subjectDir(subject), 'cves', sbomTool, scanner, `${id}.json`);
  }

  private metaPath(filePath: string): string {
    return `${filePath}.meta.json`;
  }

  private indexPath(artifactId: string): string {
    return path.join(this.indexBase(), `${artifactId}.ptr.json`);
  }

  // ── Low-level I/O ───────────────────────────────────────────────────────────

  private async ensureDir(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  private async pathExists(p: string): Promise<boolean> {
    return fs.access(p).then(() => true).catch(() => false);
  }

  private now(): string {
    return new Date().toISOString();
  }

  private async writeArtifact(
    filePath: string,
    content: string,
    metadata: ArtifactMetadata
  ): Promise<void> {
    await this.ensureDir(filePath);
    await fs.writeFile(filePath, content, 'utf-8');
    await fs.writeFile(this.metaPath(filePath), JSON.stringify(metadata, null, 2), 'utf-8');
    // Write pointer into index for fast lookup
    await this.ensureDir(this.indexPath(metadata.id));
    await fs.writeFile(
      this.indexPath(metadata.id),
      JSON.stringify({ filePath, kind: metadata.kind }, null, 2),
      'utf-8'
    );
  }

  private async readMeta(filePath: string): Promise<ArtifactMetadata | null> {
    try {
      return JSON.parse(await fs.readFile(this.metaPath(filePath), 'utf-8'));
    } catch {
      return null;
    }
  }

  /** Recursively collect all .json artifact files (not .meta.json). */
  private async walk(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          results.push(...(await this.walk(full)));
        } else if (e.name.endsWith('.json') && !e.name.endsWith('.meta.json')) {
          results.push(full);
        }
      }
    } catch {
      // ignore missing dirs
    }
    return results;
  }

  // ── Subject management ──────────────────────────────────────────────────────

  async createSubject(
    subject: SubjectRef,
    metadata: Omit<SubjectMetadata, 'sboms' | 'cves' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<SubjectMetadata, 'sboms' | 'cves' | 'createdAt' | 'updatedAt'>>
  ): Promise<SubjectMetadata> {
    const metaPath = this.subjectMetaPath(subject);

    if (await this.pathExists(metaPath)) {
      throw new SubjectAlreadyExistsError(subject);
    }

    const now = new Date();
    const full: SubjectMetadata = {
      sboms: 0,
      cves: 0,
      createdAt: now,
      updatedAt: now,
      ...metadata,
      // These must always match the SubjectRef
      id: subject.id,
      type: subject.type,
    };

    await this.ensureDir(metaPath);
    await fs.writeFile(metaPath, JSON.stringify(full, null, 2), 'utf-8');
    return full;
  }

  async getSubject(subject: SubjectRef): Promise<SubjectMetadata | null> {
    try {
      return JSON.parse(await fs.readFile(this.subjectMetaPath(subject), 'utf-8'));
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
    await fs.writeFile(this.subjectMetaPath(subject), JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }

  async listSubjects(page = 1, search = ''): Promise<SubjectListResponse> {
    const base = this.subjectsBase();
    const all: SubjectMetadata[] = [];

    const types = await fs.readdir(base).catch(() => [] as string[]);

    for (const type of types) {
      const typeDir = path.join(base, type);
      const ids = await fs.readdir(typeDir).catch(() => [] as string[]);

      for (const id of ids) {
        if (search && !id.toLowerCase().includes(search.toLowerCase())) continue;

        const meta = await this.getSubject({ type: type as SubjectType, id });
        if (meta) all.push(meta);
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
    const dir = this.subjectDir(subject);
    const files = await this.walk(dir);

    // Skip the subject.json itself
    const artifacts: ArtifactMetadata[] = [];
    for (const f of files) {
      if (path.basename(f) === 'subject.json') continue;
      const meta = await this.readMeta(f);
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

  private async resolveArtifactPath(artifactId: string): Promise<string> {
    // Fast path: check index first
    const idxPath = this.indexPath(artifactId);
    try {
      const ptr = JSON.parse(await fs.readFile(idxPath, 'utf-8'));
      if (ptr?.filePath && await this.pathExists(ptr.filePath)) {
        return ptr.filePath;
      }
    } catch {
      // fall through to walk
    }

    // Slow path: walk the whole tree (handles legacy data without index)
    const allFiles = await this.walk(this.subjectsBase());
    for (const f of allFiles) {
      const meta = await this.readMeta(f);
      if (meta?.id === artifactId) {
        // Backfill the index
        await this.ensureDir(idxPath);
        await fs.writeFile(
          idxPath,
          JSON.stringify({ filePath: f, kind: meta.kind }, null, 2),
          'utf-8'
        );
        return f;
      }
    }

    throw new ArtifactNotFoundError(artifactId);
  }

  async getArtifactContent(artifactId: string): Promise<string> {
    const filePath = await this.resolveArtifactPath(artifactId);
    return fs.readFile(filePath, 'utf-8');
  }

  async getArtifactMetadata(artifactId: string): Promise<ArtifactMetadata> {
    const filePath = await this.resolveArtifactPath(artifactId);
    const meta = await this.readMeta(filePath);
    if (!meta) throw new ArtifactNotFoundError(artifactId);
    return meta;
  }

  async deleteArtifact(artifactId: string): Promise<void> {
    const filePath = await this.resolveArtifactPath(artifactId);
    const meta = await this.readMeta(filePath);
    if (!meta) throw new ArtifactNotFoundError(artifactId);

    await fs.unlink(filePath).catch(() => {});
    await fs.unlink(this.metaPath(filePath)).catch(() => {});
    await fs.unlink(this.indexPath(artifactId)).catch(() => {});

    // Decrement subject counter
    await this.updateSubject(meta.subject, {
      [meta.kind === 'sbom' ? 'sboms' : 'cves']: Math.max(
        0,
        await this.getSubject(meta.subject).then(
          (s) => (s ? (meta.kind === 'sbom' ? s.sboms : s.cves) - 1 : 0)
        )
      ),
    });
  }

  // ── SBOM ────────────────────────────────────────────────────────────────────

  async saveSBOM(
    subject: SubjectRef,
    tool: string,
    content: string,
    extra: Partial<Omit<SbomMetadata, 'id' | 'kind' | 'subject' | 'tool' | 'hash' | 'hashAlgorithm' | 'size' | 'createdAt' | 'path'>> = {}
  ): Promise<SbomMetadata> {
    // Auto-create subject if it doesn't exist yet
    const existingSubject = await this.getSubject(subject);
    if (!existingSubject) {
      await this.createSubject(subject, {
        id: subject.id,
        type: subject.type,
        name: subject.id,
      });
    }

    const timestamp = this.now();
    const hash = this.hash(content);
    const id = crypto.randomUUID();
    const filePath = this.sbomPath(subject, tool, timestamp);

    const meta: SbomMetadata = {
      id,
      subject,
      kind: 'sbom',
      tool,
      hash,
      hashAlgorithm: 'sha256',
      size: Buffer.byteLength(content, 'utf-8'),
      createdAt: new Date(timestamp),
      path: filePath,
      ...extra,
    };

    await this.writeArtifact(filePath, content, meta);
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
    // Auto-create subject if it doesn't exist yet
    const existingSubject = await this.getSubject(subject);
    if (!existingSubject) {
      await this.createSubject(subject, {
        id: subject.id,
        type: subject.type,
        name: subject.id,
      });
    }

    const timestamp = this.now();
    const hash = this.hash(content);
    // Deterministic id: one CVE report per (subject, sbomTool, scanner)
    const id = crypto
      .createHash('sha256')
      .update(`${subject.type}:${subject.id}:${sbomTool}:${scanner}`)
      .digest('hex')
      .slice(0, 16);

    const filePath = this.cvePath(subject, sbomTool, scanner, id);

    if (await this.pathExists(filePath)) {
      throw new DuplicateArtifactError(
        `CVE report for ${subject.id} / ${sbomTool} / ${scanner} already exists. Use PUT to update.`
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
      path: filePath,
      ...extra,
    };

    await this.writeArtifact(filePath, content, meta);
    await this.updateSubject(subject, {
      cves: ((await this.getSubject(subject))?.cves ?? 0) + 1,
    });

    return meta;
  }

  // ── CVE upsert (replace existing) ──────────────────────────────────────────

  async upsertCVE(
    subject: SubjectRef,
    sbomTool: string,
    scanner: string,
    content: string,
    extra: Partial<Omit<CveMetadata, 'id' | 'kind' | 'subject' | 'tool' | 'sbomTool' | 'hash' | 'hashAlgorithm' | 'size' | 'createdAt' | 'path'>> = {}
  ): Promise<CveMetadata> {
    const id = crypto
      .createHash('sha256')
      .update(`${subject.type}:${subject.id}:${sbomTool}:${scanner}`)
      .digest('hex')
      .slice(0, 16);

    const filePath = this.cvePath(subject, sbomTool, scanner, id);

    if (await this.pathExists(filePath)) {
      // Overwrite – read old meta to preserve createdAt
      const old = await this.readMeta(filePath);
      const hash = this.hash(content);
      const meta: CveMetadata = {
        ...(old as CveMetadata),
        hash,
        size: Buffer.byteLength(content, 'utf-8'),
        updatedAt: new Date(),
        ...extra,
      };
      await fs.writeFile(filePath, content, 'utf-8');
      await fs.writeFile(this.metaPath(filePath), JSON.stringify(meta, null, 2), 'utf-8');
      return meta;
    }

    return this.saveCVE(subject, sbomTool, scanner, content, extra);
  }
}