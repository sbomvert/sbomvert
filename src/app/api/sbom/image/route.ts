import { LocalSbomService } from '@/services/localSbomService';
import { S3SbomService } from '@/services/sbomServiceS3';
import { ISbomService } from '@/services/sbomService.types';
import { NextResponse } from 'next/server';

let sbomService: ISbomService;

if (process.env.NODE_ENV === 'production') {
  sbomService = new S3SbomService(
    process.env.S3_SBOM_BUCKET || 'sbomvert',
    process.env.S3_SBOM_PREFIX || 'sbom/',
    20
  );
} else {
  sbomService = new LocalSbomService('./public/sbom', 20);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const container = searchParams.get('name');

  if (!container) {
    return NextResponse.json({ error: 'Container name is required' }, { status: 400 });
  }

  try {
    // Use shared interface method, works for BOTH S3 and Local
    const files = await sbomService.listFiles(container);

    if (!files || files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error(`Error listing SBOM files for ${container}:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve SBOM files' },
      { status: 500 }
    );
  }
}
