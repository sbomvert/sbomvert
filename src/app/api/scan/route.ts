import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { authorizeScanRequest } from '@/lib/auth/scan-auth';
import { isValidImageRef } from '@sbomvert/core/image';
import { buildScanFlow, getScanFlows } from '@sbomvert/core/queue';

const ScanRequestSchema = z.object({
  image: z.string().refine(isValidImageRef, 'Invalid image reference'),
  tools: z.object({
    producers: z.array(z.string()).nonempty(),
    consumers: z.array(z.string()).nonempty(),
  }),
});

// Only queues the scan; the scan worker app (worker/) runs it.
export async function POST(request: Request) {
  if (!FEATURE_FLAGS.ENABLE_SCAN_API) {
    return NextResponse.json({ error: 'Scan feature disabled' }, { status: 403 });
  }

  const parsed = ScanRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }

  // Defense in depth: the proxy also gates this, but don't rely on it alone.
  if (FEATURE_FLAGS.ENABLE_AUTH) {
    const auth = await authorizeScanRequest(request.headers);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  }

  try {
    // one job per tool, under a parent scan job whose id identifies the scan
    const { job } = await getScanFlows().add(buildScanFlow(parsed.data));
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error) {
    console.error('Failed to queue scan', error);
    return NextResponse.json({ error: 'Scan queue unavailable' }, { status: 503 });
  }
}
