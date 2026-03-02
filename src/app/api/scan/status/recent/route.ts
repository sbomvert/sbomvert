import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const jobsDir = path.join(process.cwd(), 'storage', 'jobs');
    const files = await fs.readdir(jobsDir);
    // Get file stats for sorting
    const fileInfos = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(jobsDir, file);
        const stat = await fs.stat(fullPath);
        return { file, mtime: stat.mtimeMs, fullPath };
      })
    );
    // Sort by modification time descending and take up to 10
    const recent = fileInfos
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 10);

    const results = await Promise.all(
      recent.map(async ({ file, fullPath }) => {
        const content = await fs.readFile(fullPath, 'utf-8');
        const data = JSON.parse(content);
        const jobId = file.replace(/\.json$/i, '');
        return { jobId, ...data };
      })
    );
    return NextResponse.json(results);
  } catch (err) {
    console.error('Error fetching recent scan jobs', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
