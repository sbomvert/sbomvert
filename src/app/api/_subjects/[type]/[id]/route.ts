import { NextRequest, NextResponse } from 'next/server';
import { parseSubjectParams, errorResponse } from '@/app/api/_lib/validation';
import artifactStorage from '@/services/artifactStorageService/artifactStorage';

type Params = { params: Promise<{ type: string; id: string }> };

// ─── GET /api/subjects/[type]/[id] ───────────────────────────────────────────
// Returns the subject metadata (including sbom/cve counts).

export async function GET(_req: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const parsed = parseSubjectParams(type, id);
  if (!parsed.ok) return parsed.response;

  try {
    const subject = await artifactStorage.getSubject(parsed.subject);
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    return NextResponse.json(subject);
  } catch (err) {
    return errorResponse(err, 'Failed to fetch subject');
  }
}

// ─── PATCH /api/subjects/[type]/[id] ─────────────────────────────────────────
// Body: { name?, description?, tags?, owner? }
// Updates mutable subject fields.

export async function PATCH(request: NextRequest, { params }: Params) {
  const { type, id } = await params;
  const parsed = parseSubjectParams(type, id);
  if (!parsed.ok) return parsed.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description, tags, owner } = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof name === 'string') patch.name = name;
  if (typeof description === 'string') patch.description = description;
  if (Array.isArray(tags)) patch.tags = tags as string[];
  if (typeof owner === 'string') patch.owner = owner;

  try {
    const updated = await artifactStorage.updateSubject(parsed.subject, patch);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.name === 'SubjectNotFoundError') {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return errorResponse(err, 'Failed to update subject');
  }
}