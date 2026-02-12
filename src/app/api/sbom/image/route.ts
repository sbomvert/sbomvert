
import { NextResponse } from 'next/server';
import SBOMService  from '@/services/sbomStorageService/sbomStorageService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const container = searchParams.get('name');

  if (!container) {
    return NextResponse.json({ error: 'Container name is required' }, { status: 400 });
  }

  try {
    // Use shared interface method, works for BOTH S3 and Local
    const files = await SBOMService.listFiles(container);

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
