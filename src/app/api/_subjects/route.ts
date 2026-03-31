import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {SubjectMetadata,SubjectType} from '@/services/artifactStorageService/artifactStorageService.types';
import artifactService from '@/services/artifactStorageService/artifactStorage';



const createSubjectSchema = z.object({
  type: z.enum(SubjectType),
  id: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export async function POST(request: NextRequest) {
  try {
     const parsed = createSubjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error }, { status: 400 });}

    const { type, id, name, description, tags } = parsed.data;

    const subject = { type, id };

    const exists = await artifactService.getSubject(subject)

    if (exists !== null) {
      return NextResponse.json(
        { error: 'Subject already exists' },
        { status: 409 }
      );
    }


    const now = new Date();

  const subjectMeta: SubjectMetadata = {
    id: subject.id,
    name: name || subject.id,
    type: subject.type,
    createdAt: now,
    updatedAt: now,
    sboms: 0,
    cves:  0,
    description:description,
    tags: tags,
  };

    const result = await artifactService.createSubject(subject,subjectMeta);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'Subject already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}


/*const getSubjectSchema = z.object({
  type: z.enum(SubjectType),
  id: z.string().min(1),
});*/

const listSubjects = z.object({
  page: z.number().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const pageRaw = url.searchParams.get('page');
    const searchRaw = url.searchParams.get('search');

    const page = pageRaw === null ? undefined : Number(pageRaw);
    const search = searchRaw === null ? undefined : searchRaw;

    const parsed = listSubjects.safeParse({ page, search });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid params', details: parsed.error }, { status: 400 });
    }

    const { page: parsedPage, search: parsedSearch } = parsed.data;
    const result = await artifactService.listSubjects(parsedPage, parsedSearch);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to list subjects' }, { status: 500 });
  }
}
