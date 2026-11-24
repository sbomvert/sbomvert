/** @jest-environment node */
import { CycloneDxBom } from '../cyclonedx/types';
import { SpdxDocument } from '../spdx/types';
import { detectTool, formatOf } from './detectTool';

const spdx = (...creators: string[]) =>
  ({ spdxVersion: 'SPDX-2.3', name: 'x', creationInfo: { creators, created: '' }, packages: [] }) as SpdxDocument;
const cdx = (tools: unknown) => ({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1, metadata: { tools } }) as CycloneDxBom;

describe('detectTool', () => {
  test.each([
    [['Tool: syft-1.54.1'], 'anchore'],
    [['Tool: trivy-0.76.0'], 'trivy'],
    [['Tool: docker-scout-1.29.0'], 'docker'],
    [['Organization: Google', 'Tool: artifactanalysis-0.1'], 'google'],
    [['Tool: Amazon Inspector'], 'amazon'],
    [['Organization: SBOMVert', 'Tool: Microsoft.SBOMTool-4.1.5'], 'microsoft'],
  ])('SPDX creators %j: %s', (creators, tool) => {
    expect(detectTool(spdx(...creators))).toBe(tool);
  });

  test.each([
    [{ components: [{ type: 'application', name: 'syft' }] }, 'anchore'],
    [{ components: [{ type: 'application', name: 'trivy' }] }, 'trivy'],
    [{ components: [{ type: 'application', name: 'inspector-sbomgen' }] }, 'amazon'],
    [[{ name: 'docker-scout', version: '1.29.0' }], 'docker'],
  ])('CycloneDX tools %j: %s', (tools, tool) => {
    expect(detectTool(cdx(tools))).toBe(tool);
  });

  test('nothing to detect: no creators, no creation info, no metadata, an unknown tool', () => {
    expect(detectTool(spdx())).toBeUndefined();
    expect(detectTool({ ...spdx(), creationInfo: undefined } as unknown as SpdxDocument)).toBeUndefined();
    expect(detectTool({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1 })).toBeUndefined();
    expect(detectTool(spdx('Tool: some-scanner-1.0'))).toBeUndefined();
    expect(detectTool(cdx({ components: [{ type: 'application', name: 'some-scanner' }] }))).toBeUndefined();
  });

  test('cdxgen, which also lists its plugins (its own trivy) as tools, is not taken for one of them', () => {
    const components = [
      { name: 'trivy', properties: [{ name: 'cdx:plugin:manifest:name', value: 'trivy' }] },
      { name: 'trustinspector', properties: [{ name: 'cdx:plugin:manifest:name', value: 'trustinspector' }] },
      { name: 'cdxgen', version: '13.8.0' },
    ];
    expect(detectTool(cdx({ components }))).toBeUndefined();
  });
});

describe('formatOf', () => {
  test('SPDX and CycloneDX documents', () => {
    expect(formatOf(spdx())).toBe('spdx');
    expect(formatOf(cdx([]))).toBe('cdx');
  });

  test.each([[{}], [null], ['x'], [[]], [{ bomFormat: 'SPDX' }], [{ spdxVersion: 2 }]])('not an SBOM: %j', doc => {
    expect(formatOf(doc)).toBeUndefined();
  });
});
