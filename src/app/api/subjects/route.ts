import { NextRequest, NextResponse } from 'next/server';
import { artifactStorage } from '@/services/artifactStorageService/artifactStorage';
import {
  SubjectMetadata,
  SubjectType,
  SUBJECT_TYPES,
  SubjectAlreadyExistsError,
} from '@/services/artifactStorageService/artifactStorageService.types';
import { isValidSubjectType, errorResponse } from '@/app/api/_lib/validation';

// ─── GET /api/subjects ────────────────────────────────────────────────────────
// Query params: page (number), search (string)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const search = searchParams.get('search') ?? '';

    const result = await artifactStorage.listSubjects(page, search);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, 'Failed to list subjects');
  }
}

// ─── POST /api/subjects ───────────────────────────────────────────────────────
// Body: { type, id, name?, description?, tags?, owner? }

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, id, name, description, tags, owner } = body as Record<string, unknown>;

  if (!type || !isValidSubjectType(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${SUBJECT_TYPES.join(', ')}` },
      { status: 400 }
    );
  }
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json({ error: 'id must be a non-empty string' }, { status: 400 });
  }

  const subject = { type: type as SubjectType, id: id.trim() };
  const now = new Date();

  const metadata: Omit<SubjectMetadata, 'sboms' | 'cves' | 'createdAt' | 'updatedAt'> = {
    id: subject.id,
    type: subject.type,
    name: typeof name === 'string' ? name : subject.id,
    description: typeof description === 'string' ? description : undefined,
    tags: Array.isArray(tags) ? (tags as string[]) : undefined,
    owner: typeof owner === 'string' ? owner : undefined,
  };

  try {
    const result = await artifactStorage.createSubject(subject, metadata);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof SubjectAlreadyExistsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return errorResponse(err, 'Failed to create subject');
  }
}