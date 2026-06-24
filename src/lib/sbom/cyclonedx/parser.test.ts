import { readFileSync } from 'fs';
import path from 'path';
import { AnalyzeCycloneDX, parseCycloneDxSbom } from './parser';

const baseBom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  version: 1,
  metadata: {
    timestamp: '2024-01-01T00:00:00Z',
    tools: {
      components: [
        {
          type: 'application',
          author: 'anchore',
          name: 'syft',
          version: '1.45.1',
        },
      ],
    },
  },
  components: [],
};

describe('parseCycloneDxSbom', () => {
  it('parses tool info and package fields', () => {
    const bom = {
      ...baseBom,
      components: [
        {
          type: 'library',
          name: 'alpine-baselayout',
          version: '3.7.2-r1',
          supplier: { name: 'Natanael Copa' },
          licenses: [{ license: { id: 'GPL-2.0-only' } }],
          cpe: 'cpe:2.3:a:alpine-baselayout:alpine-baselayout:3.7.2-r1:*:*:*:*:*:*:*',
          purl: 'pkg:apk/alpine/alpine-baselayout@3.7.2-r1?arch=x86_64',
          hashes: [{ alg: 'SHA-256', content: 'abc123' }],
        },
      ],
    };

    const result = parseCycloneDxSbom(bom as any, 'golang:1.26-alpine', 'syft.cdx.json');

    expect(result).not.toBeNull();
    expect(result?.format).toBe('CycloneDX');
    expect(result?.tool).toBe('syft');
    expect(result?.toolInfo).toEqual({
      name: 'syft',
      version: '1.45.1',
      vendor: undefined,
      format: 'CycloneDX',
    });
    expect(result?.imageId).toBe('golang:1.26-alpine');
    expect(result?.timestamp).toBe('2024-01-01T00:00:00Z');
    expect(result?.packages).toEqual([
      {
        name: 'alpine-baselayout',
        version: '3.7.2-r1',
        supplier: 'Natanael Copa',
        license: 'GPL-2.0-only',
        packageType: 'os',
        hash: 'sha-256:abc123',
        purl: 'pkg:apk/alpine/alpine-baselayout@3.7.2-r1?arch=x86_64',
        cpe: 'cpe:2.3:a:alpine-baselayout:alpine-baselayout:3.7.2-r1:*:*:*:*:*:*:*',
      },
    ]);
  });

  it('drops components without PURL and dedupes duplicate PURLs', () => {
    const bom = {
      ...baseBom,
      components: [
        {
          type: 'operating-system',
          name: 'alpine',
          version: '3.24.1',
        },
        {
          type: 'library',
          name: 'stdlib',
          version: '1.26.4',
          purl: 'pkg:golang/stdlib@1.26.4',
          'bom-ref': 'pkg:golang/stdlib@1.26.4?package-id=1',
        },
        {
          type: 'library',
          name: 'stdlib',
          version: '1.26.4',
          purl: 'pkg:golang/stdlib@1.26.4',
          'bom-ref': 'pkg:golang/stdlib@1.26.4?package-id=2',
        },
        {
          type: 'library',
          name: 'cmd/link',
          version: '1.26.4',
          purl: 'pkg:golang/cmd/link@1.26.4',
        },
      ],
    };

    const result = parseCycloneDxSbom(bom as any, 'golang:1.26-alpine', 'syft.cdx.json');

    expect(result?.packages.map(pkg => pkg.purl)).toEqual([
      'pkg:golang/stdlib@1.26.4',
      'pkg:golang/cmd/link@1.26.4',
    ]);
  });

  it('preserves unique nested PURL components', () => {
    const bom = {
      ...baseBom,
      components: [
        {
          type: 'application',
          name: 'parent',
          version: '1.0.0',
          purl: 'pkg:generic/parent@1.0.0',
          components: [
            {
              type: 'library',
              name: 'child',
              version: '2.0.0',
              purl: 'pkg:npm/child@2.0.0',
            },
          ],
        },
      ],
    };

    const result = parseCycloneDxSbom(bom as any, 'app:latest', 'syft.cdx.json');

    expect(result?.packages.map(pkg => pkg.name)).toEqual(['parent', 'child']);
    expect(result?.packages.map(pkg => pkg.packageType)).toEqual(['generic', 'npm']);
  });

  it('handles missing metadata tools gracefully', () => {
    const bom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      version: 1,
      components: [
        {
          type: 'library',
          name: 'express',
          purl: 'pkg:npm/express@4.18.2',
        },
      ],
    };

    const result = parseCycloneDxSbom(bom as any, 'node:latest', 'trivy.cdx.json');

    expect(result?.toolInfo.name).toBe('Trivy');
    expect(result?.toolInfo.version).toBe('unknown');
    expect(result?.packages[0].version).toBe('unknown');
  });

  it('supports license expressions and named licenses', () => {
    const bom = {
      ...baseBom,
      components: [
        {
          type: 'library',
          name: 'with-expression',
          purl: 'pkg:npm/with-expression@1.0.0',
          licenses: [{ expression: 'MIT OR Apache-2.0' }],
        },
        {
          type: 'library',
          name: 'with-name',
          purl: 'pkg:npm/with-name@1.0.0',
          licenses: [{ license: { name: 'Custom License' } }],
        },
      ],
    };

    const result = parseCycloneDxSbom(bom as any, 'node:latest', 'syft.cdx.json');

    expect(result?.packages.map(pkg => pkg.license)).toEqual([
      'MIT OR Apache-2.0',
      'Custom License',
    ]);
  });

  it('parses the generated Go CycloneDX sample', () => {
    const filePath = path.join(
      process.cwd(),
      'public/sbom/golang1.26-alpine/syft.cdx.json'
    );
    const bom = JSON.parse(readFileSync(filePath, 'utf8'));

    const result = parseCycloneDxSbom(bom, 'golang1.26-alpine', 'syft.cdx.json');

    expect(result?.toolInfo.name).toBe('syft');
    expect(result?.toolInfo.version).toBe('1.45.1');
    expect(result?.packages).toHaveLength(29);
    expect(
      result?.packages.filter(pkg => pkg.purl === 'pkg:golang/stdlib@1.26.4')
    ).toHaveLength(1);
    expect(result?.packages.every(pkg => pkg.purl)).toBe(true);
  });
});

describe('AnalyzeCycloneDX', () => {
  it('uses the same filtered and deduped package set for analysis', () => {
    const bom = {
      ...baseBom,
      components: [
        {
          type: 'library',
          name: 'stdlib',
          version: '1.26.4',
          purl: 'pkg:golang/stdlib@1.26.4',
          'bom-ref': 'pkg:golang/stdlib@1.26.4?package-id=1',
          licenses: [{ license: { id: 'BSD-3-Clause' } }],
        },
        {
          type: 'library',
          name: 'stdlib',
          version: '1.26.4',
          purl: 'pkg:golang/stdlib@1.26.4',
          'bom-ref': 'pkg:golang/stdlib@1.26.4?package-id=2',
        },
        {
          type: 'library',
          name: 'express',
          version: '4.18.2',
          purl: 'pkg:npm/express@4.18.2',
        },
        {
          type: 'library',
          name: 'no-purl',
          version: '1.0.0',
        },
      ],
    };

    const parsed = parseCycloneDxSbom(bom as any, 'golang:1.26-alpine', 'syft.cdx.json');
    const analyzed = AnalyzeCycloneDX(bom as any, 'golang:1.26-alpine', 'syft.cdx.json');

    expect(analyzed.packages.map(pkg => pkg.purl)).toEqual(
      parsed?.packages.map(pkg => pkg.purl)
    );
    expect(analyzed.info.totalPackages).toBe(2);
    expect(analyzed.info.licenseInfo).toEqual({
      declared: 1,
      deducted: 0,
      unknown: 1,
    });
    expect(analyzed.info.packageInfo).toEqual({
      generic: 1,
      npm: 1,
    });
  });

  it('collects standard component CPEs', () => {
    const bom = {
      ...baseBom,
      components: [
        {
          type: 'library',
          name: 'openssl',
          version: '1.1.1',
          purl: 'pkg:deb/debian/openssl@1.1.1',
          cpe: 'cpe:2.3:a:openssl:openssl:1.1.1:*:*:*:*:*:*:*',
        },
      ],
    };

    const analyzed = AnalyzeCycloneDX(bom as any, 'debian:latest', 'syft.cdx.json');

    expect(analyzed.packages[0].cpes).toEqual([
      'cpe:2.3:a:openssl:openssl:1.1.1:*:*:*:*:*:*:*',
    ]);
  });

  it('analyzes the generated Go CycloneDX sample', () => {
    const filePath = path.join(
      process.cwd(),
      'public/sbom/golang1.26-alpine/syft.cdx.json'
    );
    const bom = JSON.parse(readFileSync(filePath, 'utf8'));

    const analyzed = AnalyzeCycloneDX(bom, 'golang1.26-alpine', 'syft.cdx.json');

    expect(analyzed.info.format).toBe('CycloneDX');
    expect(analyzed.info.tool).toBe('syft');
    expect(analyzed.info.toolVersion).toBe('1.45.1');
    expect(analyzed.info.totalPackages).toBe(29);
    expect(analyzed.packages).toHaveLength(29);
    expect(
      analyzed.packages.filter(pkg => pkg.purl === 'pkg:golang/stdlib@1.26.4')
    ).toHaveLength(1);
  });
});
