/** @jest-environment node */
import { CycloneDxBom } from '../cyclonedx/types';
import { SpdxDocument } from '../spdx/types';
import { comparisonKeys } from './comparisonKeys';

// bsdutils and a Go module as Syft 1.54.1, Trivy 0.76.0 and Docker Scout 1.29.0 wrote them (public/sbom, debian:13.7
// and docker:29.9.3)
const WRITTEN = {
  syft: {
    creator: 'Tool: syft-1.54.1',
    deb: 'pkg:deb/debian/bsdutils@1%3A2.41.5-0%2Bdeb13u1?arch=arm64&distro=debian-13.7&upstream=util-linux%402.41.5-0%2Bdeb13u1',
    go: 'pkg:golang/github.com/DefangLabs/secret-detector@v0.0.0-20260916192156-3e28d7ed64df',
  },
  trivy: {
    creator: 'Tool: trivy-0.76.0',
    deb: 'pkg:deb/debian/bsdutils@2.41.5-0%2Bdeb13u1?arch=amd64&distro=debian-13.7&epoch=1',
    go: 'pkg:golang/github.com/defanglabs/secret-detector@v0.0.0-20260916192156-3e28d7ed64df',
  },
  scout: {
    creator: 'Tool: docker-scout-1.29.0',
    deb: 'pkg:deb/debian/bsdutils@1%3A2.41.5-0%2Bdeb13u1?os_distro=trixie&os_name=debian&os_version=13',
    go: 'pkg:golang/github.com/defanglabs/secret-detector@v0.0.0-20260916192156-3e28d7ed64df',
  },
};

const spdx = (creator: string, ...purls: string[]): SpdxDocument =>
  ({
    spdxVersion: 'SPDX-2.3',
    name: 'x',
    creationInfo: { creators: [creator], created: '' },
    packages: purls.map((purl, i) => ({
      name: `p${i}`,
      SPDXID: `SPDXRef-${i}`,
      externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: purl }],
    })),
  }) as unknown as SpdxDocument;

const cdx = (tools: unknown, ...purls: string[]): CycloneDxBom =>
  ({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1, metadata: { tools }, components: purls.map(purl => ({ type: 'library', name: 'x', purl })) }) as unknown as CycloneDxBom;

describe('comparisonKeys', () => {
  test.each(Object.entries(WRITTEN))('%s: the same package gets the same key whichever tool wrote it', (_, { creator, deb, go }) => {
    const keyOf = comparisonKeys(spdx(creator, deb, go));
    expect(keyOf(deb)).toBe('deb/debian/bsdutils@2.41.5-0+deb13u1');
    expect(keyOf(go)).toBe('golang/github.com/defanglabs/secret-detector@0.0.0-20260916192156-3e28d7ed64df');
  });

  test('CycloneDX: the tool is found in `tools.components` and in a list of tools (Scout)', () => {
    const syft = comparisonKeys(cdx({ components: [{ name: 'syft' }] }, WRITTEN.syft.deb));
    const scout = comparisonKeys(cdx([{ name: 'docker-scout' }], WRITTEN.scout.deb));
    expect(syft(WRITTEN.syft.deb)).toBe('deb/debian/bsdutils@2.41.5-0+deb13u1');
    expect(scout(WRITTEN.scout.deb)).toBe('deb/debian/bsdutils@2.41.5-0+deb13u1');
  });

  test('packages of the same name stay apart: Go major versions, other ecosystems', () => {
    const purls = ['pkg:golang/github.com/klauspost/compress/v2@v2.1.0', 'pkg:golang/github.com/jackc/pgx/v2@v2.1.0', 'pkg:pypi/six@1.16.0', 'pkg:deb/debian/six@1.16.0'];
    const keyOf = comparisonKeys(spdx(WRITTEN.syft.creator, ...purls));
    expect(new Set(purls.map(keyOf)).size).toBe(4);
  });

  test('Maven without its group, on which tools disagree; no key for the image itself', () => {
    const syft = comparisonKeys(spdx(WRITTEN.syft.creator, 'pkg:maven/org.objectweb.asm/asm@9.10.1', 'pkg:oci/debian@sha256%3Ae5?arch=arm64&tag=13.7'));
    const trivy = comparisonKeys(spdx(WRITTEN.trivy.creator, 'pkg:maven/org.ow2.asm/asm@9.10.1'));
    expect(syft('pkg:maven/org.objectweb.asm/asm@9.10.1')).toBe('maven//asm@9.10.1');
    expect(trivy('pkg:maven/org.ow2.asm/asm@9.10.1')).toBe('maven//asm@9.10.1');
    expect(syft('pkg:oci/debian@sha256%3Ae5?arch=arm64&tag=13.7')).toBeUndefined();
  });

  test('a tool without a translator: the key from the purl alone, without the epoch', () => {
    const keyOf = comparisonKeys(spdx('Tool: osv-scanner', 'pkg:deb/debian/bsdutils@1:2.41.5-0%2Bdeb13u1?arch=amd64', 'pkg:golang/github.com/foo/bar@v1.2.3'));
    expect(keyOf('pkg:deb/debian/bsdutils@1:2.41.5-0%2Bdeb13u1?arch=amd64')).toBe('deb/debian/bsdutils@2.41.5-0+deb13u1');
    expect(keyOf('pkg:golang/github.com/foo/bar@v1.2.3')).toBe('golang/github.com/foo/bar@1.2.3');
  });

  test('a tool without a translator that names the distro by its family (cdxgen `amazon`) gets the same key as one using the os-release id (osv `amzn`)', () => {
    const cdxgenPurl = 'pkg:rpm/amazon/bash@5.2.15-1.amzn2023.0.2?arch=aarch64';
    const osvPurl = 'pkg:rpm/amzn/bash@5.2.15-1.amzn2023.0.2';
    const cdxgenKey = comparisonKeys(cdx({ components: [{ name: 'cdxgen' }] }, cdxgenPurl))(cdxgenPurl);
    const osvKey = comparisonKeys(spdx('Tool: osv-scanner', osvPurl))(osvPurl);
    expect(cdxgenKey).toBeDefined();
    expect(cdxgenKey).toBe(osvKey);
  });

  test('an unknown tool (no creators, no CycloneDX metadata, a name no translator has): the key from the purl alone', () => {
    const deb = 'pkg:deb/debian/bsdutils@1:2.41.5-0%2Bdeb13u1?arch=amd64';
    const noCreators = { ...spdx('x', deb), creationInfo: { creators: [], created: '' } } as SpdxDocument;
    const noCreationInfo = { ...spdx('x', deb), creationInfo: undefined } as unknown as SpdxDocument;
    const noMetadata = { ...cdx(undefined, deb), metadata: undefined } as CycloneDxBom;
    for (const doc of [noCreators, noCreationInfo, noMetadata, cdx({ components: [{ name: 'some-scanner' }] }, deb), cdx([{}], deb)]) {
      expect(comparisonKeys(doc)(deb)).toBe('deb/debian/bsdutils@2.41.5-0+deb13u1');
    }
  });

  test('no key without a purl, or for one that does not parse', () => {
    const keyOf = comparisonKeys(spdx(WRITTEN.syft.creator));
    expect(keyOf(undefined)).toBeUndefined();
    expect(keyOf('not a purl')).toBeUndefined();
  });
});
