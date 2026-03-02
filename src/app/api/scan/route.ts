import { NextResponse } from 'next/server';
import { scanQueue } from '@/services/scanQueue';
import { z } from 'zod';

// Payload schema – simple validation
const ScanRequestSchema = z.object({
  image: z.string().min(1),
  tools: z.array(z.string()).nonempty(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ScanRequestSchema.parse(body);

    // Enqueue a job – job data includes image and selected tools
    const job = await scanQueue.add('scan-job', {
      image: parsed.image,
      tools: parsed.tools,
    });

    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error) {
    // Validation errors or queue failures – respond with 400
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
