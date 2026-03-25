import { NextResponse } from 'next/server';
import { SubjectType, SUBJECT_TYPES, SubjectTypeValue } from '@/services/artifactStorageService/artifactStorageService.types';

// ─── Validation helpers (no zod dependency) ───────────────────────────────────

export function isValidSubjectType(v: unknown): v is SubjectTypeValue {
  return SUBJECT_TYPES.includes(v as SubjectTypeValue);
}

export interface ParsedSubjectParams {
  type: SubjectType;
  id: string;
}

export function parseSubjectParams(
  type: string | undefined,
  id: string | undefined
): { ok: true; subject: ParsedSubjectParams } | { ok: false; response: NextResponse } {
  if (!type || !isValidSubjectType(type)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Invalid subject type. Must be one of: ${SUBJECT_TYPES.join(', ')}` },
        { status: 400 }
      ),
    };
  }
  if (!id || id.trim() === '') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Subject id is required' }, { status: 400 }),
    };
  }
  return { ok: true, subject: { type: type as SubjectType, id } };
}

export function errorResponse(
  error: unknown,
  fallback = 'Internal server error',
  status = 500
): NextResponse {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}