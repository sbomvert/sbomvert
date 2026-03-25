// app/api/artifacts/cve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import artifactService from '@/services/artifactStorageService/artifactStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      subject,
      sbomTool,
      scanner,
      content,
      metadata,
    } = body;

    if (!subject || !sbomTool || !scanner || !content) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: subject, sbomTool, scanner, content',
        },
        { status: 400 }
      );
    }

    const result = await artifactService.saveCVE(
      subject,
      sbomTool,
      scanner,
      content,
      metadata
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST CVE error:', error);

    if (error.message.includes('SBOM not found')) {
      return NextResponse.json(
        { error: 'Invalid SBOM reference' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save CVE' },
      { status: 500 }
    );
  }
}