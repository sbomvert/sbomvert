import { NextRequest, NextResponse } from 'next/server';
import { LocalSbomService } from '@/services/localSbomService';

// Helper function to create responses that work in both test and production environments

const sbomService = new LocalSbomService('./public/sbom', 20);

function createResponse(data: any, init?: ResponseInit) {
  if (process.env.NODE_ENV === 'test') {
    return {
      json: () => Promise.resolve(data),
    };
  }
  return NextResponse.json(data, init);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';

    const result = await sbomService.listSboms(page, search);
    return createResponse(result);
  } catch (error) {
    console.error('Error reading SBOM directory:', error);
    return createResponse({ error: 'Failed to read SBOM directory' }, { status: 500 });
  }
}
