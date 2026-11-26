import { NextResponse } from 'next/server';
import SBOMService from '@sbomvert/storage/sbom/sbomStorageService';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { authorizeScanRequest } from '@/lib/auth/scan-auth';
import { SbomFormatName } from '@/models/ISbom';
import { parseSpdxSbom, parseCycloneDxSbom } from '@/lib/parseSbom';
import { reverseFormatContainerName } from '@/lib/container/containerUtils';
import { isSafeName } from '@sbomvert/storage/safePath';
import { MAX_SBOM_BYTES } from '@/lib/sbom/uploadLimits';

// Room for the other form fields on top of the file.
const FORM_OVERHEAD_BYTES = 64 * 1024;

export async function POST(request: Request) {
  // Check if SBOM upload is enabled via feature flag
  if (!FEATURE_FLAGS.ENABLE_SBOM_UPLOAD) {
    return NextResponse.json({ error: 'SBOM upload is not enabled' }, { status: 403 });
  }

  if (FEATURE_FLAGS.ENABLE_AUTH) {
    const auth = await authorizeScanRequest(request.headers);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  }

  // Refuse a declared size before reading the body. A chunked body with no Content-Length is still buffered by formData(); a streaming limit is the next step.
  if (Number(request.headers.get('content-length') ?? 0) > MAX_SBOM_BYTES + FORM_OVERHEAD_BYTES) {
    return NextResponse.json({ error: 'SBOM file is larger than 10 MB' }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    // the name as typed, trimmed: the form trims too, but the API can be called directly
    const typedContainer = formData.get('containerName');
    const containerName = typeof typedContainer === 'string' ? typedContainer.trim() : '';

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

    if (Buffer.byteLength(content, 'utf8') > MAX_SBOM_BYTES) {
      return NextResponse.json({ error: 'SBOM file is larger than 10 MB' }, { status: 413 });
    }

    // Detect SBOM format (SPDX or CycloneDX) from the content
    let format: SbomFormatName | null = null;
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
        const sbom = parseCycloneDxSbom(parsedData, containerName, file.name);
        if (!sbom) {
          return NextResponse.json({ error: 'Failed to parse CycloneDX SBOM' }, { status: 400 });
        }
      }
      else {
        return NextResponse.json({ error: 'Unknown SBOM format. Expected SPDX or CycloneDX format' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON format. Please provide a valid SBOM file' }, { status: 400 });
    }

    // The stored type is the format the content really is; a form that names another one is refused
    const type = format === 'SPDX' ? 'spdx' : 'cdx';
    const formType = formData.get('format');
    if (formType !== null && formType !== type) {
      return NextResponse.json({ error: 'Format must be spdx or cdx, and match the file' }, { status: 400 });
    }

    // tool from the form, else from the file name (e.g. "trivy.spdx.json")
    const toolField = formData.get('tool');
    if (toolField !== null && typeof toolField !== 'string') {
      return NextResponse.json({ error: 'Tool must be a name' }, { status: 400 });
    }
    const parts = file.name.split('.');
    const tool = toolField || (parts[0] ?? 'unknown');
    // stored like the other SBOMs (`libraryslashnginxtwodots1.2`); a name that is not a plain name could leave the SBOM directory
    const folder = reverseFormatContainerName(containerName);
    if (![folder, tool].every(isSafeName)) {
      return NextResponse.json({ error: 'Invalid container or file name' }, { status: 400 });
    }

    // Never replace an SBOM already stored, scanner output included. A new tool name makes a new file.
    // ponytail: check then write is not atomic; two uploads racing for one name can both pass. Add an exclusive create later.
    const fileName = `${tool}.${type}.json`;
    const stored = await SBOMService.listFiles(folder);
    if (stored.some(existing => existing.name === fileName)) {
      return NextResponse.json({ error: `${fileName} already exists for this image` }, { status: 409 });
    }

    await SBOMService.saveSBOM(folder, type, tool, content);

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