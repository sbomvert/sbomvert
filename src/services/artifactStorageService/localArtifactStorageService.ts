import {
  IArtifactStorage, SubjectArtifacts, SubjectRef, ArtifactMetadata, SbomMetadata, CveMetadata, SubjectListResponse, SubjectType, ArtifactKind, SubjectMetadata

} from "./artifactStorageService.types";


import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { PathLike } from "fs";

export class LocalArtifactStorage extends IArtifactStorage {
  constructor(private rootDir: string) {
    super()
  }

  // ---------- Utilities ----------

  

  private subjectMetaPath(subject: SubjectRef): string {
    return path.join(
      this.rootDir,
      'subjects',
      subject.type,
      subject.id,
      'subject.json'
    );
  }
  private async fileExists(path:PathLike) {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
  //private cveReportExists(subject: SubjectRef,tool:string,id:string)

  private now(): string {
    return new Date().toISOString();
  }

  private buildBasePath(subject: SubjectRef): string {
    return path.join(this.rootDir, 'subjects', subject.type, subject.id);
  }

  private buildSbomPath(subject: SubjectRef, tool: string, timestamp: string) {
    return path.join(this.buildBasePath(subject), 'sbom', tool, `${timestamp}.json`);
  }

  private buildCvePath(
    subject: SubjectRef,
    sbomTool: string,
    scanner: string,
    timestamp: string
  ) {
    return path.join(
      this.buildBasePath(subject),
      'cves',
      sbomTool,
      scanner,
      `${timestamp}.json`
    );
  }

  private metaPath(filePath: string): string {
    return `${filePath}.meta.json`;
  }

  private async ensureDir(filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  private async writeFileWithMeta(
    filePath: string,
    content: string,
    metadata: ArtifactMetadata
  ) {
    await this.ensureDir(filePath);
    await fs.writeFile(filePath, content, 'utf-8');
    await fs.writeFile(this.metaPath(filePath), JSON.stringify(metadata, null, 2));
  }

  private async readMetadata(filePath: string): Promise<ArtifactMetadata | null> {
    try {
      const meta = await fs.readFile(this.metaPath(filePath), 'utf-8');
      return JSON.parse(meta);
    } catch {
      return null;
    }
  }

  private async walk(dir: string): Promise<string[]> {
    let results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          results = results.concat(await this.walk(fullPath));
        } else if (entry.name.endsWith('.json') && !entry.name.endsWith('.meta.json')) {
          results.push(fullPath);
        }
      }
    } catch {
      // ignore missing dirs
    }

    return results;
  }

  // ---------- Core Methods ----------

  async saveSBOM(
    subject: SubjectRef,
    tool: string,
    content: string,
    metadata: Partial<SbomMetadata> = {}
  ): Promise<ArtifactMetadata> {
    const timestamp = this.now();
    const hash = this.hash(content);
    const filePath = this.buildSbomPath(subject, tool, timestamp);

    const meta: SbomMetadata = {
      id: crypto.randomUUID(),
      subject,
      kind: 'sbom',
      tool,
      hash,
      hashAlgorithm: 'sha256',
      size: Buffer.byteLength(content),
      createdAt: new Date(timestamp),
      path: filePath,
      ...metadata,
    };

    await this.writeFileWithMeta(filePath, content, meta);
    return meta;
  }

  async saveCVE(
    subject: SubjectRef,
    sbomTool: string,
    scanner: string,
    content: string,
    metadata: Partial<CveMetadata> = {}
  ): Promise<ArtifactMetadata> {
    //TODO:  lineage validation (basic)

    const now = new Date();
    const timestamp = this.now()
    const hash = this.hash(content);

    const subjectExists = await this.getSubject(subject)

    if (subjectExists === null) { // Create Subject


      const subjectMeta: SubjectMetadata = {
        ...subject,
        name: subject.id,
        createdAt: now,
        updatedAt: now,
        sboms: 0,
        cves: 1,
      };
      await this.createSubject(subject, subjectMeta)

    }

    const cvefileid = subject.id+scanner
    const filePath = this.buildCvePath(subject, sbomTool, scanner, cvefileid );

    // TODO: move to endpoint

    
      const result = await this.fileExists(filePath)

      if (result) {
       throw new Error('Artifact duplicated'); 
      }

    const meta: CveMetadata = {
      id: cvefileid,
      subject,
      kind: 'cve',
      tool: scanner,
      sbomTool,
      sbomHash: "",
      hash,
      hashAlgorithm: 'sha256',
      size: Buffer.byteLength(content),
      createdAt: new Date(timestamp),
      path: filePath,
      ...metadata,
    };

    const subjectMeta = await this.getSubject(subject);
    if (subjectMeta == null) {
     throw new Error('Subject not found'); 
    }

    await this.createSubject(subject,{
      ...subjectMeta,
      updatedAt: now,
      cves: subjectMeta.cves +=1,

    })

    await this.writeFileWithMeta(filePath, content, meta);



    return meta;
  }

  async getArtifactContent(artifactId: string): Promise<string> {
    const all = await this.walk(path.join(this.rootDir, 'subjects'));

    for (const file of all) {
      const meta = await this.readMetadata(file);
      if (meta?.id === artifactId) {
        return fs.readFile(file, 'utf-8');
      }
    }

    throw new Error('Artifact not found');
  }

  async getSubjectArtifacts(subject: SubjectRef): Promise<SubjectArtifacts> {
    const base = this.buildBasePath(subject);
    const files = await this.walk(base);

    const artifacts: ArtifactMetadata[] = [];

    for (const file of files) {
      const meta = await this.readMetadata(file);
      if (meta) {
        artifacts.push(meta);
      }
    }

    return { subject, artifacts };
  }

  async listArtifactsByType(
    subject: SubjectRef,
    kind: ArtifactKind
  ): Promise<ArtifactMetadata[]> {
    const { artifacts } = await this.getSubjectArtifacts(subject);

    return artifacts.filter((a) => a.kind === kind);
  }

  async createSubject(
    subject: SubjectRef,
    metadata: SubjectMetadata
  ): Promise<SubjectMetadata> {
    const filePath = this.subjectMetaPath(subject);

    // prevent overwrite
    try {
      await fs.access(filePath);
      throw new Error('Subject already exists');
    } catch {
      // expected if not exists
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });



    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));

    return metadata;
  }

  async listSubjects(page = 1, search = ''): Promise<SubjectListResponse> {
    const base = path.join(this.rootDir, 'subjects');

    const subjects: SubjectMetadata[] = [];

    const types = await fs.readdir(base).catch(() => []);

    for (const type of types) {
      const typeDir = path.join(base, type);
      const ids = await fs.readdir(typeDir).catch(() => []);

      for (const id of ids) {
        if (search && !id.includes(search)) continue;

        const subject: SubjectRef = {
          type: type as SubjectType,
          id,
        };

        const meta = await this.getSubject(subject);
        if (!meta) continue;

        subjects.push(meta);
      }
    }

    const itemsPerPage = 10;
    const totalItems = subjects.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      subjects: subjects.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
      ),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage,
      },
    };
  }

  async getSubject(subject: SubjectRef): Promise<SubjectMetadata | null> {
    try {
      const data = await fs.readFile(this.subjectMetaPath(subject), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

}