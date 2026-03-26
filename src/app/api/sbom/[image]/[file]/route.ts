import SBOMService from '@/services/sbomStorageService/sbomStorageService';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface Params {
  image: string;
  file: string;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<Params> }
) {
  const { image, file } = await context.params;

  const result = await SBOMService.getFileContent(image, file);

  try {
    return NextResponse.json(JSON.parse(result));
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }
}