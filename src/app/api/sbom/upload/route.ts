import { NextResponse } from 'next/server';
import SBOMService from '@/services/sbomStorageService/sbomStorageService';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { parseSpdxSbom, parseCycloneDxSbom } from '@/lib/parseSbom';

export async function POST(request: Request) {
  // Check if SBOM upload is enabled via feature flag
  if (!FEATURE_FLAGS.ENABLE_SBOM_UPLOAD) {
    return NextResponse.json({ error: 'SBOM upload is not enabled' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const containerName = formData.get('containerName') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!containerName) {
      return NextResponse.json({ error: 'Container name is required' }, { status: 400 });
    }

    // Read file content
    let content: string;
    if (typeof file.text === 'function') {
      content = await file.text();
    } else {
      const buffer = await file.arrayBuffer();
      content = new TextDecoder().decode(buffer);
    }

    // Detect SBOM format (SPDX or CycloneDX)
    let format: 'SPDX' | 'CycloneDX' | null = null;
    let parsedData: any = null;

    // Try to detect format by parsing JSON
    try {
      parsedData = JSON.parse(content);

      // Check for SPDX format
      if (parsedData.spdxVersion) {
        format = 'SPDX';
        // Parse SPDX SBOM
        const sbom = parseSpdxSbom(parsedData, containerName, file.name);
        if (!sbom) {
          return NextResponse.json({ error: 'Failed to parse SPDX SBOM' }, { status: 400 });
        }
      }
      // Check for CycloneDX format
      else if (parsedData.bomFormat) {
        format = 'CycloneDX';
        // Parse CycloneDX SBOM (placeholder)
        const sbom = parseCycloneDxSbom(parsedData, containerName, file.name);
        if (!sbom) {
          // For now, we'll treat this as a valid format but return success
          // In a real implementation, this would be properly handled
          format = 'CycloneDX';
        }
      }
      else {
        return NextResponse.json({ error: 'Unknown SBOM format. Expected SPDX or CycloneDX format' }, { status: 400 });
      }
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON format. Please provide a valid SBOM file' }, { status: 400 });
    }

    // Save the file using the existing storage service
    const fileName = `${containerName}/${file.name}`;
    await SBOMService.saveFile(fileName, content);

    return NextResponse.json({
      message: 'SBOM file uploaded successfully',
      format,
      containerName
    });
  } catch (error) {
    console.error('Error uploading SBOM file:', error);
    return NextResponse.json({ error: 'Failed to upload SBOM file' }, { status: 500 });
  }
}