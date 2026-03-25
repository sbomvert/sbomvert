import { NextRequest, NextResponse } from 'next/server';
import { parseSubjectParams, errorResponse } from '@/app/api/_lib/validation';
import {
  DuplicateArtifactError,
  CveMetadata,
} from '@/services/artifactStorageService/artifactStorageService.types';
import { LocalArtifactStorage } from '@/services/artifactStorageService/localArtifactStorageService';
import artifactStorage from '@/services/artifactStorageService/artifactStorage';

type Params = { params: Promise<{ type: string; id: string }> };

// ─── GET /api/subjects/[type]/[id]/cves ──────────────────────────────────────
// Optional query params:
//   sbomTool – filter by the SBOM tool the scan was run against
//   scanner  – filter by CVE scanner name

export async function GET(request: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const parsed = parseSubjectParams(type, id);
  if (!parsed.ok) return parsed.response;

  try {
    const subject = await artifactStorage.getSubject(parsed.subject);
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    let cves = (await artifactStorage.listArtifactsByKind(
      parsed.subject,
      'cve'
    )) as CveMetadata[];

    const { searchParams } = request.nextUrl;
    const sbomToolFilter = searchParams.get('sbomTool');
    const scannerFilter = searchParams.get('scanner');

    if (sbomToolFilter) {
      cves = cves.filter((c) => c.sbomTool === sbomToolFilter);
    }
    if (scannerFilter) {
      cves = cves.filter((c) => c.tool === scannerFilter);
    }

    return NextResponse.json({ cves });
  } catch (err) {
    return errorResponse(err, 'Failed to list CVE reports');
  }
}

// ─── Shared body parser ───────────────────────────────────────────────────────

async function parseCveBody(request: NextRequest): Promise<
  | { ok: true; sbomTool: string; scanner: string; content: string; extra: Partial<CveMetadata> }
  | { ok: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const b = body as Record<string, unknown>;
  const sbomTool = typeof b.sbomTool === 'string' ? b.sbomTool.trim() : '';
  const scanner = typeof b.scanner === 'string' ? b.scanner.trim() : '';
  const content = typeof b.content === 'string' ? b.content : '';

  if (!sbomTool) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'sbomTool is required (the SBOM generator the scan was run against)' },
        { status: 400 }
      ),
    };
  }
  if (!scanner) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'scanner is required (e.g. "grype", "trivy")' },
        { status: 400 }
      ),
    };
  }
  if (!content) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'content is required' }, { status: 400 }),
    };
  }

  // Validate JSON
  try {
    JSON.parse(content);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'content must be valid JSON' }, { status: 400 }),
    };
  }

  const extra: Partial<CveMetadata> = {};
  if (typeof b.sbomHash === 'string') extra.sbomHash = b.sbomHash;
  if (typeof b.toolVersion === 'string') extra.toolVersion = b.toolVersion;
  if (typeof b.format === 'string') extra.format = b.format;
  if (b.summary && typeof b.summary === 'object') {
    extra.summary = b.summary as CveMetadata['summary'];
  }

  return { ok: true, sbomTool, scanner, content, extra };
}

// ─── POST /api/subjects/[type]/[id]/cves ─────────────────────────────────────
// Saves a new CVE report. Returns 409 if one already exists for the same
// (subject, sbomTool, scanner) triple. Use PUT to overwrite.
//
// Body: { sbomTool, scanner, content, sbomHash?, toolVersion?, format?, summary? }

export async function POST(request: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const parsed = parseSubjectParams(type, id);
  if (!parsed.ok) return parsed.response;

  const bodyResult = await parseCveBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const { sbomTool, scanner, content, extra } = bodyResult;

  try {
    const meta = await artifactStorage.saveCVE(
      parsed.subject,
      sbomTool,
      scanner,
      content,
      extra
    );
    return NextResponse.json(meta, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateArtifactError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return errorResponse(err, 'Failed to save CVE report');
  }
}

// ─── PUT /api/subjects/[type]/[id]/cves ──────────────────────────────────────
// Upserts a CVE report — creates if absent, replaces if present.
// Only supported with the local storage backend; S3 does a normal saveCVE
// after deleting the old key.
//
// Body: same as POST

export async function PUT(request: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const parsed = parseSubjectParams(type, id);
  if (!parsed.ok) return parsed.response;

  const bodyResult = await parseCveBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const { sbomTool, scanner, content, extra } = bodyResult;

  try {
    // LocalArtifactStorage exposes upsertCVE; fall back to delete+save for S3
    let meta: CveMetadata;
    if (artifactStorage instanceof LocalArtifactStorage) {
      meta = await artifactStorage.upsertCVE(
        parsed.subject,
        sbomTool,
        scanner,
        content,
        extra
      );
    } else {
      // Generic upsert: try save; if duplicate, delete then save
      try {
        meta = await artifactStorage.saveCVE(parsed.subject, sbomTool, scanner, content, extra);
      } catch (err) {
        if (err instanceof DuplicateArtifactError) {
          // Find the existing artifact and delete it
          const existing = (
            await artifactStorage.listArtifactsByKind(parsed.subject, 'cve')
          ) as CveMetadata[];
          const old = existing.find(
            (c) => c.sbomTool === sbomTool && c.tool === scanner
          );
          if (old) await artifactStorage.deleteArtifact(old.id);
          meta = await artifactStorage.saveCVE(parsed.subject, sbomTool, scanner, content, extra);
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json(meta);
  } catch (err) {
    return errorResponse(err, 'Failed to upsert CVE report');
  }
}