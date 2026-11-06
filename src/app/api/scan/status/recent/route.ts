import { NextResponse } from 'next/server';
import { getRecentScans, getScanFlows, getScanQueue } from '@sbomvert/core/queue';

export async function GET() {
  try {
    return NextResponse.json(await getRecentScans(getScanFlows(), getScanQueue()));
  } catch (error) {
    console.error('Error fetching recent scan jobs', error);
    return NextResponse.json({ error: 'Scan queue unavailable' }, { status: 503 });
  }
}
