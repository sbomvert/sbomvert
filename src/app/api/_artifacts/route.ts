import { NextRequest, NextResponse } from 'next/server';
import artifactService from '@/services/artifactStorageService/artifactStorage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';

    const result = await artifactService.listSubjects(page, search);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/artifacts error:', error);
    return NextResponse.json(
      { error: 'Failed to list subjects' },
      { status: 500 }
    );
  }
}

