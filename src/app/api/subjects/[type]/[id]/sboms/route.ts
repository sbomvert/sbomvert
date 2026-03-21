// app/api/artifacts/[type]/[id]/sboms/route.ts
import { artifactService } from '@/services/artifactStorageService/artifactStorage';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const subject = {
      type: params.type as any,
      id: params.id,
    };

    const sboms = await artifactService.listArtifactsByType(subject, 'sbom');

    return NextResponse.json(sboms);
  } catch (error) {
    console.error('GET SBOMs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SBOMs' },
      { status: 500 }
    );
  }
}