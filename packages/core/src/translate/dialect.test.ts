/** @jest-environment node */
import { CycloneDxComponent } from '../cyclonedx/types';
import { parsePackageUrl } from '../purl/packageUrl';
import { SpdxPackage } from '../spdx/types';
import { converterFor } from './dialect';
import { cycloneDxAdapter } from './formats/cyclonedx';
import { spdxAdapter } from './formats/spdx';
import { CanonicalPackage, Dialect } from './types';

const purl = (s: string) => parsePackageUrl(s)!;
const BINARY = 'pkg:deb/debian/libtinfo6@6.5-2?arch=amd64';
const SOURCE = 'pkg:deb/debian/ncurses@6.5-2';
const canonical: CanonicalPackage = { type: 'deb', namespace: 'debian', name: 'libtinfo6', version: '6.5-2', upstream: { name: 'ncurses' } };

// A dialect that reads every package as `canonical`, writes it back as BINARY with an epoch, and lists
// the source package besides it when asked to
const dialect = (withSource: boolean): Dialect => ({
  toCanonical: view => (view.purls.length ? { ...canonical, version: view.version ?? '' } : undefined),
  fromCanonical: () => ({ purls: [purl(BINARY)], version: '1:6.5-2' }),
  extras: () => (withSource ? [{ purls: [purl(SOURCE)], version: '6.5-2' }] : []),
});

const spdxPackage: SpdxPackage = {
  name: 'libtinfo6',
  SPDXID: 'SPDXRef-libtinfo6',
  versionInfo: '6.5-2',
  supplier: 'Organization: Debian',
  externalRefs: [
    { referenceCategory: 'SECURITY', referenceType: 'cpe23Type', referenceLocator: 'cpe:2.3:a:libtinfo6' },
    { referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:deb/debian/libtinfo6@6.5-2' },
  ],
} as SpdxPackage;

describe('converterFor', () => {
  test('reads a package through the format: its purls and version', () => {
    const { toCanonical } = converterFor(dialect(false), spdxAdapter);
    expect(toCanonical(spdxPackage)).toEqual(canonical);
    expect(toCanonical({ ...spdxPackage, externalRefs: [] })).toBeUndefined();
  });

  test('writes the package itself, keeping what the dialect does not write', () => {
    const [main, ...rest] = converterFor(dialect(false), spdxAdapter).fromCanonical!(canonical, spdxPackage);
    expect(rest).toEqual([]);
    expect(main).toMatchObject({ SPDXID: 'SPDXRef-libtinfo6', name: 'libtinfo6', versionInfo: '1:6.5-2', supplier: 'Organization: Debian' });
    expect(spdxAdapter.view(main).purls).toEqual([BINARY]);
    expect(main.externalRefs?.[0].referenceType).toBe('cpe23Type');
  });

  test("SPDX: the package's source comes after it, as a package of its own with its own id, name and purl", () => {
    const [main, source] = converterFor(dialect(true), spdxAdapter).fromCanonical!(canonical, spdxPackage);
    expect(main.SPDXID).toBe('SPDXRef-libtinfo6');
    expect(source).toMatchObject({ SPDXID: 'SPDXRef-libtinfo6-source', name: 'ncurses', versionInfo: '6.5-2' });
    // the purl only: not the binary's CPE
    expect(source.externalRefs).toEqual([{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: SOURCE }]);
  });

  test('CycloneDX: the same, without the nested components and CPE of the package', () => {
    const component = {
      type: 'library',
      'bom-ref': 'libtinfo6-ref',
      name: 'libtinfo6',
      version: '6.5-2',
      purl: 'pkg:deb/debian/libtinfo6@6.5-2',
      cpe: 'cpe:2.3:a:libtinfo6',
      components: [{ type: 'file', name: '/usr/lib/libtinfo.so.6' }],
    } as CycloneDxComponent;
    const [main, source] = converterFor(dialect(true), cycloneDxAdapter).fromCanonical!(canonical, component);
    expect(main).toMatchObject({ 'bom-ref': 'libtinfo6-ref', name: 'libtinfo6', purl: BINARY, cpe: 'cpe:2.3:a:libtinfo6' });
    expect(source).toMatchObject({ 'bom-ref': 'libtinfo6-ref-source', name: 'ncurses', purl: SOURCE, version: '6.5-2' });
    expect(source).not.toHaveProperty('cpe');
    expect(source).not.toHaveProperty('components');
  });

  test('a dialect without fromCanonical cannot write', () => {
    const { fromCanonical: _, ...readOnly } = dialect(true);
    expect(converterFor(readOnly, spdxAdapter).fromCanonical).toBeUndefined();
  });
});
