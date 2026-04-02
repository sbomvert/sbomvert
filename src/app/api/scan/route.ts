import { NextResponse } from 'next/server';
import { createScanQueue } from '@/services/scanQueue';
import { z } from 'zod';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

// Payload schema – simple validation
const ScanRequestSchema = z.object({
  image: z.string().min(1),
  tools: z.object({
    producers: z.array(z.string()).nonempty(),
    consumers: z.array(z.string()).nonempty(),
  }),
});

export async function POST(request: Request) {
  if (FEATURE_FLAGS.ENABLE_SCAN_API) {
    return NextResponse.json(
      { error: 'Scan feature disabled' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = ScanRequestSchema.parse(body);

    // Lazy initialize queue at runtime (not build time)
    const scanQueue = createScanQueue();

    const job = await scanQueue.add('scan-job', {
      image: parsed.image,
      tools: parsed.tools,
    });

    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid request';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}