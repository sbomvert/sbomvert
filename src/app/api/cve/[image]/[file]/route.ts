import CVEService from '@/services/cveStorageService/cveStorageService';
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

  const result = await CVEService.getFileContent(image, file);

  return NextResponse.json(JSON.parse(result));
}