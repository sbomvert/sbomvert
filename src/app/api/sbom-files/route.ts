import { NextRequest, NextResponse } from 'next/server';
import { LocalSbomService } from '@/services/localSbomService';
import { S3SbomService } from '@/services/sbomServiceS3';

// Initialize the SBOM service
var sbomService: any
if (process.env.NODE_ENV === 'production') {
 sbomService = new S3SbomService('sbomvert', 'sbom/', 20);

} else {
 sbomService = new LocalSbomService('./public/sbom', 20); 

}

// Helper function to create responses
function createResponse(data: any, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function GET(request: NextRequest) {
  // Extract the URL and query parameters directly
  const { searchParams } = new URL(request.url);

  try {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';

    const result = await sbomService.listSboms(page, search);
    return createResponse(result);
  } catch (error) {
    console.error('Error reading SBOM directory:', error);
    return createResponse({ error: 'Failed to read SBOM directory' }, { status: 500 });
  }
}
