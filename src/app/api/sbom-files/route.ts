import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sbomDir = path.join(process.cwd(), 'public', 'sbom');
    
    // Check if directory exists
    if (!fs.existsSync(sbomDir)) {
      return NextResponse.json({ containers: [] });
    }

    // Read all container directories
    const containerDirs = fs.readdirSync(sbomDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const containers = containerDirs.map(containerName => {
      const containerPath = path.join(sbomDir, containerName);
      const files = fs.readdirSync(containerPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
        .map(dirent => ({
          name: dirent.name,
          path: `/sbom/${containerName}/${dirent.name}`,
        }));

      return {
        name: containerName,
        files,
      };
    });

    return NextResponse.json({ containers });
  } catch (error) {
    console.error('Error reading SBOM directory:', error);
    return NextResponse.json(
      { error: 'Failed to read SBOM directory' },
      { status: 500 }
    );
  }
}