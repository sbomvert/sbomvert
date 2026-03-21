import { NextRequest, NextResponse } from 'next/server';
import artifactStorage from '@/services/artifactStorageService/artifactStorage';
import { ArtifactNotFoundError } from '@/services/artifactStorageService/artifactStorageService.types';
import { errorResponse } from '@/app/api/_lib/validation';

type Params = { params: { id: string } };

// ─── GET /api/artifacts/[id] ─────────────────────────────────────────────────
// Returns the artifact content (raw JSON string) by default.
// Query param:
//   meta=true  – return only the metadata object, not the full content

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Artifact id is required' }, { status: 400 });
  }

  const metaOnly = request.nextUrl.searchParams.get('meta') === 'true';

  try {
    if (metaOnly) {
      const meta = await artifactStorage.getArtifactMetadata(id);
      return NextResponse.json(meta);
    }

    const content = await artifactStorage.getArtifactContent(id);

    // Return as parsed JSON so callers don't need to double-parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      // If for some reason content isn't JSON, return as plain text
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof ArtifactNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return errorResponse(err, 'Failed to fetch artifact');
  }
}

// ─── DELETE /api/artifacts/[id] ──────────────────────────────────────────────
// Deletes the artifact and decrements the subject counter.

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Artifact id is required' }, { status: 400 });
  }

  try {
    await artifactStorage.deleteArtifact(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ArtifactNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return errorResponse(err, 'Failed to delete artifact');
  }
}