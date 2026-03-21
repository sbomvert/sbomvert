import { NextRequest, NextResponse } from 'next/server';
import { artifactStorage } from '@/services/artifactStorageService/artifactStorage';
import { parseSubjectParams, errorResponse } from '@/app/api/_lib/validation';

type Params = { params: { type: string; id: string } };

// ─── GET /api/subjects/[type]/[id]/artifacts ──────────────────────────────────
// Returns all artifacts (SBOMs + CVE reports) for a subject, optionally
// filtered by kind.
//
// Query params:
//   kind – "sbom" | "cve"  (optional, returns both if omitted)

export async function GET(request: NextRequest, { params }: Params) {
  const parsed = parseSubjectParams(params.type, params.id);
  if (!parsed.ok) return parsed.response;

  try {
    const subject = await artifactStorage.getSubject(parsed.subject);
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const kindParam = request.nextUrl.searchParams.get('kind');

    let { artifacts } = await artifactStorage.getSubjectArtifacts(parsed.subject);

    if (kindParam === 'sbom' || kindParam === 'cve') {
      artifacts = artifacts.filter((a) => a.kind === kindParam);
    }

    return NextResponse.json({ subject, artifacts });
  } catch (err) {
    return errorResponse(err, 'Failed to fetch artifacts');
  }
}