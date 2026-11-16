/** @jest-environment node */
import { CycloneDxBom } from '../cyclonedx/types';
import { parsePackageUrl } from '../purl/packageUrl';
import { SpdxDocument } from '../spdx/types';
import { convertSbom } from './index';
import { sourceTools, translateSbom, translateTargets } from './translateSbom';

// bsdutils as Trivy 0.76.0 wrote it (public/sbom, debian:13.7)
const TRIVY_DEB = 'pkg:deb/debian/bsdutils@2.41.5-0%2Bdeb13u1?arch=amd64&distro=debian-13.7&epoch=1';
const spdx = (creator: string, purl: string, versionInfo: string): SpdxDocument =>
  ({
    spdxVersion: 'SPDX-2.3',
    name: 'debian:13.7',
    creationInfo: { creators: [creator], created: '2026-11-16T00:00:00Z' },
    packages: [
      {
        name: 'bsdutils',
        SPDXID: 'SPDXRef-Package-1',
        versionInfo,
        externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: purl }],
      },
    ],
  }) as SpdxDocument;

describe('sourceTools', () => {
  test('the tools whose SBOMs can be read, per format', () => {
    expect(sourceTools('cdx')).toEqual(['anchore', 'docker', 'trivy', 'amazon']);
    expect(sourceTools('spdx')).toEqual(['anchore', 'trivy', 'docker', 'google', 'amazon', 'microsoft']);
  });
});

describe('translateTargets', () => {
  test('every tool and format with a writer, but the source itself', () => {
    const targets = translateTargets({ tool: 'trivy', format: 'cdx' });
    expect(targets).toHaveLength(9);
    expect(targets).toContainEqual({ tool: 'google', format: 'spdx' });
    expect(targets).not.toContainEqual({ tool: 'trivy', format: 'cdx' });
    expect(targets).not.toContainEqual({ tool: 'google', format: 'cdx' });
    expect(targets.slice(0, 6).every(t => t.format === 'spdx')).toBe(true);
  });
});

describe('translateSbom', () => {
  test('Trivy SPDX to Syft CycloneDX: the format and the tool change', () => {
    const out = translateSbom(spdx('Tool: trivy-0.76.0', TRIVY_DEB, '1:2.41.5-0+deb13u1'), { tool: 'trivy', format: 'spdx' }, { tool: 'anchore', format: 'cdx' }) as CycloneDxBom;
    expect(out.bomFormat).toBe('CycloneDX');
    const purl = parsePackageUrl(out.components!.find(c => c.name === 'bsdutils')!.purl!)!;
    expect(purl).toMatchObject({ type: 'deb', namespace: 'debian', name: 'bsdutils', version: '1:2.41.5-0+deb13u1' });
    expect(purl.qualifiers.distro).toBe('debian-13.7');
    expect(purl.qualifiers.epoch).toBeUndefined();
  });

  test('within SPDX, the same as convertSbom', () => {
    const doc = spdx('Tool: syft-1.54.1', 'pkg:deb/debian/bsdutils@1:2.41.5-0%2Bdeb13u1?arch=amd64&distro=debian-13.7', '1:2.41.5-0+deb13u1');
    expect(translateSbom(doc, { tool: 'anchore', format: 'spdx' }, { tool: 'trivy', format: 'spdx' })).toEqual(convertSbom(doc, 'trivy'));
  });

  test('a pair without a translator is refused', () => {
    const doc = spdx('Tool: trivy-0.76.0', TRIVY_DEB, '1:2.41.5-0+deb13u1');
    expect(() => translateSbom(doc, { tool: 'trivy', format: 'spdx' }, { tool: 'google', format: 'cdx' })).toThrow('No translator for google cdx');
    expect(() => translateSbom(doc, { tool: 'microsoft', format: 'cdx' }, { tool: 'trivy', format: 'spdx' })).toThrow('No translator for microsoft cdx');
  });
});
