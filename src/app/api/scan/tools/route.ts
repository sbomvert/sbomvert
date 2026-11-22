import { NextResponse } from 'next/server';
import { SBOM_FORMATS, SupportedTools } from '@sbomvert/scan/tools';

// What a scan can run: producers make SBOMs (in the formats they support), consumers scan them for CVEs.
export function GET() {
  return NextResponse.json({ formats: SBOM_FORMATS, ...SupportedTools });
}
