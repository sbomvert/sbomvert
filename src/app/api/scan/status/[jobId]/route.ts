import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getScanFlows, getScanQueue, getScanStatus } from '@sbomvert/core/queue';

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  try {
    const status = await getScanStatus(getScanFlows(), getScanQueue(), jobId);
    if (!status) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to read scan status', error);
    return NextResponse.json({ error: 'Scan queue unavailable' }, { status: 503 });
  }
}
