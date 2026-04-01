/** @jest-environment jsdom */
import { SanitizeContainerImage } from '@/lib/utils';

describe('ExportButtons download URL logic', () => {
  it('constructs correct download URL', () => {
    const imageId = 'myrepo/image:latest';
    const sanitizedContainer = SanitizeContainerImage(imageId);
    const toolName = 'Syft';
    const format = 'CycloneDX';
    const fileExtension = format === 'CycloneDX' ? 'cyclonedx.json' : 'spdx.json';
    const sanitizedTool = toolName.replace(/[\\/]/g, '-').toLowerCase();
    const downloadUrl = `/api/sbom/${sanitizedContainer}/${sanitizedTool}.${fileExtension}`;
    expect(downloadUrl).toBe('/api/sbom/myreposlashimagetwodotslatest/syft.cyclonedx.json');
  });
});
