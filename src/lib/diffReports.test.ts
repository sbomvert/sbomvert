import { compareMultipleTools } from './diffReports';
import { ISbom } from '@/models/ISbom';

// Helper to create minimal SBOM objects
const createSbom = (tool: string, packages: ISbom['packages']): ISbom => ({
  format: 'SPDX',
  tool,
  toolInfo: { name: tool },
  imageId: 'image-123',
  packages,
  timestamp: new Date().toISOString(),
});

describe('diffReports.compareMultipleTools', () => {
  test('produces correct comparisons and statistics', () => {
    const sbom1 = createSbom('trivy', [
      {
        name: 'pkgA',
        version: '1.0.0',
        supplier: 'SupplierA',
        license: 'MIT',
        packageType: 'npm',
        purl: 'pkg:npm/pkgA@1.0.0',
      },
      {
        name: 'pkgB',
        version: '2.0.0',
        packageType: 'npm',
        purl: 'pkg:npm/pkgB@2.0.0',
      },
    ]);

    const sbom2 = createSbom('syft', [
      {
        name: 'pkgA',
        version: '1.0.0',
        supplier: 'SupplierA',
        license: 'Apache-2.0', // different license -> conflict
        packageType: 'npm',
        purl: 'pkg:npm/pkgA@1.0.0',
      },
      {
        name: 'pkgC',
        version: '3.0.0',
        packageType: 'npm',
        purl: 'pkg:npm/pkgC@3.0.0',
      },
    ]);

    const result = compareMultipleTools([sbom1, sbom2]);

    // Verify package map size (A, B, C)
    expect(result.allPackages.size).toBe(3);

    // Packages with metadata conflicts (pkgA license differs)
    expect(result.statistics.packagesWithConflicts).toBe(1);

    // Common to both tools (pkgA)
    expect(result.statistics.commonToAll).toBe(1);

    // Unique per tool counts
    expect(result.statistics.uniquePerTool).toEqual({ trivy: 1, syft: 1 });

    // Tool package counts
    expect(result.statistics.toolCounts).toEqual({ trivy: 2, syft: 2 });

    // Verify that pkgA has metadata conflict flag set
    const pkgAComp = result.allPackages.get('pkgA@1.0.0');
    expect(pkgAComp?.hasMetadataConflicts).toBe(true);
    // Verify unique license list includes both licenses
    expect(pkgAComp?.uniqueLicenses.sort()).toEqual(['Apache-2.0', 'MIT'].sort());
  });

  test('matches packages on their comparison key, whatever name and version the tools give them', () => {
    const key = 'golang/github.com/defanglabs/secret-detector@0.0.0-20260916192156-3e28d7ed64df';
    const syft = createSbom('syft', [
      { name: 'github.com/DefangLabs/secret-detector', version: 'v0.0.0-20260916192156-3e28d7ed64df', packageType: 'golang', key },
    ]);
    const scout = createSbom('scout', [
      { name: 'github.com/defanglabs/secret-detector', version: '0.0.0-20260916192156-3e28d7ed64df', packageType: 'golang', key },
    ]);
    const result = compareMultipleTools([syft, scout]);
    expect([...result.allPackages.keys()]).toEqual([key]);
    expect(result.allPackages.get(key)?.foundInTools).toEqual(['syft', 'scout']);
    expect(result.statistics.commonToAll).toBe(1);
  });

  test('a tool that lists a package twice found it once', () => {
    const twice = createSbom('syft', [
      { name: 'pkgA', version: '1.0.0', packageType: 'npm' },
      { name: 'pkgA', version: '1.0.0', packageType: 'npm' },
    ]);
    const result = compareMultipleTools([twice, createSbom('trivy', [])]);
    expect(result.allPackages.get('pkgA@1.0.0')?.foundInTools).toEqual(['syft']);
    expect(result.statistics.commonToAll).toBe(0);
    expect(result.statistics.uniquePerTool).toEqual({ syft: 1, trivy: 0 });
  });

  test('a package without a purl (no type) joins the one keyed package of its name and version', () => {
    const syft = createSbom('syft', [
      { name: 'musl', version: '1.2.5-r9', packageType: 'os', purl: 'pkg:apk/alpine/musl@1.2.5-r9?arch=x86_64', key: 'apk/alpine/musl@1.2.5-r9' },
      { name: 'pcre2', version: '10.40-7.el9', packageType: 'os', purl: 'pkg:rpm/ol/pcre2@10.40-7.el9?epoch=1', key: 'rpm/ol/pcre2@10.40-7.el9' },
      { name: 'six', version: '1.16.0', packageType: 'python', purl: 'pkg:pypi/six@1.16.0', key: 'pypi//six@1.16.0' },
      { name: 'six', version: '1.16.0', packageType: 'os', purl: 'pkg:deb/debian/six@1.16.0', key: 'deb/debian/six@1.16.0' },
    ]);
    // Microsoft's sbom-tool: no purl for Alpine packages and rpms, the epoch in the version
    const microsoft = createSbom('microsoft', [
      { name: 'musl', version: '1.2.5-r9', packageType: 'os' },
      { name: 'pcre2', version: '1:10.40-7.el9', packageType: 'os' },
      { name: 'six', version: '1.16.0', packageType: 'os' },
    ]);
    const result = compareMultipleTools([syft, microsoft]);
    expect(result.allPackages.get('apk/alpine/musl@1.2.5-r9')?.foundInTools).toEqual(['syft', 'microsoft']);
    expect(result.allPackages.get('rpm/ol/pcre2@10.40-7.el9')?.foundInTools).toEqual(['syft', 'microsoft']);
    // two keyed packages of that name and version: which one it is can't be told
    expect(result.allPackages.get('six@1.16.0')?.foundInTools).toEqual(['microsoft']);
    expect(result.allPackages.size).toBe(5);
  });

  test('it does not join a package its own tool already lists', () => {
    const syft = createSbom('syft', [
      { name: 'musl', version: '1.2.5-r9', packageType: 'os', purl: 'pkg:apk/alpine/musl@1.2.5-r9', key: 'apk/alpine/musl@1.2.5-r9' },
      { name: 'musl', version: '1.2.5-r9', packageType: 'os' },
    ]);
    expect(compareMultipleTools([syft]).allPackages.size).toBe(2);
  });
});
