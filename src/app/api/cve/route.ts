import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const image = searchParams.get('image');
  if (!image) {
    return NextResponse.json({ error: 'image query param required' }, { status: 400 });
  }
  // Sanitize image name similar to other routes
  const sanitized = image.replace(/\//g, 'slash').replace(/:/g, 'twodots');
  const baseDir = join(process.cwd(), 'storage', 'cves', sanitized);
  const mergedPath = join(baseDir, 'merged.json');
  try {
    const data = await fs.readFile(mergedPath, 'utf-8');
    const json = JSON.parse(data);
    return NextResponse.json(json);
  } catch (e) {
    console.error('CVE fetch error', e);
    return NextResponse.json({ error: 'CVE data not found' }, { status: 404 });
  }
}
