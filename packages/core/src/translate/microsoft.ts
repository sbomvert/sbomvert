import { SpdxDocument, SpdxPackage } from '../spdx/types';
import { genericCanonical, genericPurl, isOsType, isPurlRef, orUndefined, parsePurlOrThrow, splitEpoch } from './common';
import { spdxAdapter } from './formats/spdx';
import { createProvider } from './provider';
import { CanonicalPackage, PackageConverter } from './types';


const toCanonical = (alpine: boolean) => (item: SpdxPackage): CanonicalPackage | undefined => {
  const refs = (item.externalRefs ?? []).filter(isPurlRef);
  if (!refs.length) {
    const [version, epoch] = splitEpoch(item.versionInfo ?? '');
    return alpine
      ? { type: 'apk', namespace: 'alpine', name: item.name, version: item.versionInfo ?? '' }
      : { type: 'rpm', namespace: '', name: item.name, version, epoch: orUndefined(epoch) };
  }
  let canonical: CanonicalPackage | undefined;
  for (const r of refs) {
    const purl = parsePurlOrThrow(r.referenceLocator);
    if (purl.type === 'deb') {
      const [version, epoch] = splitEpoch(purl.version);
      canonical = { type: 'deb', namespace: purl.namespace, name: purl.name, version, epoch: orUndefined(epoch) };
    } else {
      canonical = genericCanonical(purl);
    }
  }
  return canonical;
};

function fromCanonical(c: CanonicalPackage | undefined, pkg: SpdxPackage): SpdxPackage[] {
  const version = c?.epoch && c.epoch !== '0' ? `${c.epoch}:${c.version}` : c?.version;
  // an Alpine package or an rpm: no purl, the epoch in the version
  if (c?.type === 'apk' || c?.type === 'rpm') {
    const { externalRefs: _, ...rest } = pkg;
    const others = (pkg.externalRefs ?? []).filter(r => !isPurlRef(r));
    return [{ ...rest, versionInfo: version, ...(others.length && { externalRefs: others }) }];
  }
  const { purls } = spdxAdapter.view(pkg);
  const own =
    c && (c.type === 'deb'
      ? { type: 'deb', namespace: c.namespace, name: c.name, version: version!, qualifiers: {}, subpath: c.subpath ?? '' }
      : isOsType(c.type) ? undefined : genericPurl(c));
  return [spdxAdapter.write(pkg, { purls: purls.map(p => own ?? parsePurlOrThrow(p)) })];
}

const isAlpine = (doc: SpdxDocument) =>
  doc.packages.some(p => !(p.externalRefs ?? []).some(isPurlRef) && (/-r\d+$/.test(p.versionInfo ?? '') || p.name.startsWith('.')));

export const microsoftProvider = createProvider('Microsoft', (doc): PackageConverter => ({ toCanonical: toCanonical(isAlpine(doc)), fromCanonical }));
