import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  //console.log(request)
  const { searchParams } = new URL(request.url);
  const container = searchParams.get('name');
  if (container === null) {
    NextResponse.json({ error: 'Failed to read SBOM directory' }, { status: 500 });
  }
  try {
    const sbomDir = path.join(process.cwd(), 'public', 'sbom', container ?? '');
    console.log(sbomDir)
    // Check if directory exists
    if (!fs.existsSync(sbomDir)) {
      return NextResponse.json({ containers: [] });
    }

    const files = fs
      .readdirSync(sbomDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
      .map(dirent => ({
        name: dirent.name,
        path: `/sbom/${container}/${dirent.name}`,
      }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error reading SBOM directory:', error);
    return NextResponse.json({ error: 'Failed to read SBOM directory' }, { status: 500 });
  }
}
