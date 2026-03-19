import CVEService from '@/services/cveStorageService/cveStorageService';

import { NextResponse } from 'next/server';

interface Params {
  image: string;
  file: string;
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const { image, file } = await params;
  const result = await CVEService.getFileContent(image, file);
  // Example logic: return JSON
  return NextResponse.json(JSON.parse(result));
}
