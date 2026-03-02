import { NextResponse } from 'next/server';
import { getJobStatus } from '@/services/storage';

export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  try {
    const status = await getJobStatus(params.jobId);
    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
}
