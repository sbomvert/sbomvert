import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getJobStatus } from '@/services/storage';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;

    const status = await getJobStatus(jobId);

    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }
}