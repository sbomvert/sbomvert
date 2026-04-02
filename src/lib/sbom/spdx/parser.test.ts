import { cleanLicense, parseCreator, AnalyzeSPDX } from "./parser";
import { SpdxDocument } from "./types";

describe('SPDX analysis', () => {
  describe('cleanLicense', () => {
    it('should return undefined for NOASSERTION', () => {
      expect(cleanLicense('NOASSERTION')).toBeUndefined();
    });

    it('should return undefined for NONE', () => {
      expect(cleanLicense('NONE')).toBeUndefined();
    });

    it('should return valid license unchanged', () => {
      expect(cleanLicense('MIT')).toBe('MIT');
    });
  });

  describe('parseCreator', () => {
    it('should extract tool, version, and vendor', () => {
      const creators = [
        'Tool:syft-1.2.3',
        'Organization:anchore',
      ];

      const result = parseCreator(creators);

      expect(result).toEqual({
        tool: 'syft',
        toolVersion: '1.2.3',
        vendor: 'anchore',
      });
    });

    it('should handle missing vendor and version', () => {
      const creators = ['Tool:syft'];

      const result = parseCreator(creators);

      expect(result.tool).toBe('syft');
      expect(result.toolVersion).toBe('');
      expect(result.vendor).toBe('');
    });
  });

  describe('AnalyzeSPDX', () => {
    const baseDoc: SpdxDocument = {
      spdxVersion: 'SPDX-2.3',
      creationInfo: {
        created: '2024-01-01T00:00:00Z',
        creators: ['Tool:syft-1.0', 'Organization:anchore'],
      },
      documentNamespace: 'test-namespace',
      packages: [],
      files: [],
      relationships: [],
    } as any;

    it('should analyze empty document', () => {
      const result = AnalyzeSPDX(baseDoc, 'img-1');

      expect(result.info.totalPackages).toBe(0);
      expect(result.packages).toHaveLength(0);
    });

    it('should include only APPLICATION and versioned packages', () => {
      const doc: SpdxDocument = {
        ...baseDoc,
        packages: [
          {
            SPDXID: 'pkg-1',
            name: 'app',
            versionInfo: '1.0',
            primaryPackagePurpose: 'APPLICATION',
            externalRefs: [],
          },
          {
            SPDXID: 'pkg-2',
            name: 'os',
            primaryPackagePurpose: 'OPERATING-SYSTEM',
            externalRefs: [],
          },
        ],
      } as any;

      const result = AnalyzeSPDX(doc, 'img');

      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].spdxId).toBe('pkg-1');
    });

    it('should classify package types from purl', () => {
      const doc: SpdxDocument = {
        ...baseDoc,
        packages: [
          {
            SPDXID: 'pkg-1',
            name: 'lodash',
            versionInfo: '1.0',
            primaryPackagePurpose: 'APPLICATION',
            externalRefs: [
              {
                referenceType: 'purl',
                referenceLocator: 'pkg:npm/lodash',
              },
            ],
          },
        ],
      } as any;

      const result = AnalyzeSPDX(doc, 'img');

      expect(result.info.packageInfo.npm).toBe(1);
    });

    it('should extract licenses correctly', () => {
      const doc: SpdxDocument = {
        ...baseDoc,
        packages: [
          {
            SPDXID: 'pkg-1',
            name: 'app',
            versionInfo: '1.0',
            primaryPackagePurpose: 'APPLICATION',
            licenseDeclared: 'MIT',
          },
          {
            SPDXID: 'pkg-2',
            name: 'app2',
            versionInfo: '1.0',
            primaryPackagePurpose: 'APPLICATION',
            licenseConcluded: 'Apache-2.0',
          },
          {
            SPDXID: 'pkg-3',
            name: 'app3',
            versionInfo: '1.0',
            primaryPackagePurpose: 'APPLICATION',
          },
        ],
      } as any;

      const result = AnalyzeSPDX(doc, 'img');

      expect(result.info.licenseInfo).toEqual({
        declared: 1,
        deducted: 1,
        unknown: 1,
      });
    });

    it('should map files via CONTAINS relationships', () => {
      const doc: SpdxDocument = {
        ...baseDoc,
        packages: [
          {
            SPDXID: 'pkg-1',
            name: 'app',
            versionInfo: '1.0',
            primaryPackagePurpose: 'APPLICATION',
          },
        ],
        files: [
          {
            SPDXID: 'file-1',
            fileName: 'index.js',
            checksums: [
              {
                algorithm: 'SHA256',
                checksumValue: 'abc123',
              },
            ],
          },
        ],
        relationships: [
          {
            relationshipType: 'CONTAINS',
            spdxElementId: 'pkg-1',
            relatedSpdxElement: 'file-1',
          },
        ],
      } as any;

      const result = AnalyzeSPDX(doc, 'img');

      expect(result.packages[0].files).toHaveLength(1);
      expect(result.packages[0].files[0].fileName).toBe('index.js');
      expect(result.packages[0].files[0].sha256).toBe('abc123');
    });

    it('should handle NOASSERTION fields correctly', () => {
      const doc: SpdxDocument = {
        ...baseDoc,
        packages: [
          {
            SPDXID: 'pkg-1',
            name: 'app',
            versionInfo: '1.0',
            primaryPackagePurpose: 'APPLICATION',
            supplier: 'NOASSERTION',
            originator: 'NOASSERTION',
            downloadLocation: 'NOASSERTION',
            copyrightText: 'NOASSERTION',
          },
        ],
      } as any;

      const result = AnalyzeSPDX(doc, 'img');

      const pkg = result.packages[0];

      expect(pkg.supplier).toBeUndefined();
      expect(pkg.originator).toBeUndefined();
      expect(pkg.downloadLocation).toBeUndefined();
      expect(pkg.copyrightText).toBeUndefined();
    });

    it('should include hash from checksums', () => {
      const doc: SpdxDocument = {
        ...baseDoc,
        packages: [
          {
            SPDXID: 'pkg-1',
            name: 'app',
            versionInfo: '1.0',
            primaryPackagePurpose: 'APPLICATION',
            checksums: [
              {
                algorithm: 'SHA256',
                checksumValue: 'deadbeef',
              },
            ],
          },
        ],
      } as any;

      const result = AnalyzeSPDX(doc, 'img');

      expect(result.packages[0].hash).toBe('sha256:deadbeef');
    });
  });
});