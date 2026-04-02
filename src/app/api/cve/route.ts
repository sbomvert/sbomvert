import { NextResponse } from 'next/server';
import CVEService from '@/services/cveStorageService/cveStorageService';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const container = searchParams.get('image');

  if (!container) {
    return NextResponse.json({ error: 'Container image name is required' }, { status: 400 });
  }

  try {
    const files = await CVEService.listCVEFiles(container);

    if (!files || files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error(`Error listing CVE files for %s:`, container,error);
    return NextResponse.json({ error: 'Failed to retrieve CVE files' }, { status: 500 });
  }
}
