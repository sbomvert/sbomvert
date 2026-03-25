import { NextRequest, NextResponse } from 'next/server';
import { parseSubjectParams, errorResponse } from '@/app/api/_lib/validation';
import { DuplicateArtifactError } from '@/services/artifactStorageService/artifactStorageService.types';
import artifactStorage from '@/services/artifactStorageService/artifactStorage';

type Params = { params: Promise<{ type: string; id: string }> };

// ─── GET /api/subjects/[type]/[id]/sboms ─────────────────────────────────────
// Returns all SBOM metadata entries for this subject.

export async function GET(_req: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const parsed = parseSubjectParams(type, id);
  if (!parsed.ok) return parsed.response;

  try {
    const subject = await artifactStorage.getSubject(parsed.subject);
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const sboms = await artifactStorage.listArtifactsByKind(parsed.subject, 'sbom');
    return NextResponse.json({ sboms });
  } catch (err) {
    return errorResponse(err, 'Failed to list SBOMs');
  }
}

// ─── POST /api/subjects/[type]/[id]/sboms ────────────────────────────────────
// Accepts either multipart/form-data (file upload) or application/json.
//
// multipart fields:
//   file        – the SBOM file (required)
//   tool        – scanner name, e.g. "syft" (required)
//   toolVersion – optional
//   source      – optional provenance string (image digest, repo commit, …)
//   format      – optional, e.g. "spdx" | "cyclonedx"
//
// JSON body:
//   { tool, content, toolVersion?, source?, format? }

export async function POST(request: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const parsed = parseSubjectParams(type, id);
  if (!parsed.ok) return parsed.response;

  const contentType = request.headers.get('content-type') ?? '';

  let tool: string | undefined;
  let toolVersion: string | undefined;
  let source: string | undefined;
  let format: string | undefined;
  let content: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
    }

    tool = formData.get('tool')?.toString();
    toolVersion = formData.get('toolVersion')?.toString();
    source = formData.get('source')?.toString();
    format = formData.get('format')?.toString();

    try {
      content = await file.text();
    } catch {
      return NextResponse.json({ error: 'Failed to read file content' }, { status: 400 });
    }

    // If tool not provided as a field, try to infer from filename (e.g. "syft.spdx.json")
    if (!tool) {
      const filename = (file as File).name ?? '';
      const parts = filename.split('.');
      if (parts.length >= 2) {
        tool = parts[0];
        if (!format && parts.length >= 3) format = parts[1];
      }
    }
  } else {
    // JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    tool = typeof b.tool === 'string' ? b.tool : undefined;
    toolVersion = typeof b.toolVersion === 'string' ? b.toolVersion : undefined;
    source = typeof b.source === 'string' ? b.source : undefined;
    format = typeof b.format === 'string' ? b.format : undefined;
    content = typeof b.content === 'string' ? b.content : undefined;
  }

  if (!tool || tool.trim() === '') {
    return NextResponse.json(
      { error: 'tool is required (e.g. "syft", "trivy")' },
      { status: 400 }
    );
  }
  if (!content || content.trim() === '') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  // Validate that the content is valid JSON (SBOMs are always JSON here)
  try {
    JSON.parse(content);
  } catch {
    return NextResponse.json(
      { error: 'content must be valid JSON' },
      { status: 400 }
    );
  }

  try {
    const meta = await artifactStorage.saveSBOM(parsed.subject, tool.trim(), content, {
      toolVersion,
      source,
      format,
    });
    return NextResponse.json(meta, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateArtifactError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return errorResponse(err, 'Failed to save SBOM');
  }
}