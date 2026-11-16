import { CycloneDxComponent } from '../cyclonedx/types';
import { PackageUrl } from '../purl/packageUrl';
import {
  DISTRO_NAMES, distroFrom, genericCanonical, genericPurl, isOsType, orUndefined, parsePurlOrThrow, splitEpoch, upstreamFrom,
} from './common';
import { converterFor } from './dialect';
import { cycloneDxAdapter } from './formats/cyclonedx';
import { spdxAdapter } from './formats/spdx';
import { createProviderFor } from './provider';
import { CanonicalPackage, Dialect, PackageConverter, PackageView, PackageWrite } from './types';


function toCanonical({ purls }: PackageView): CanonicalPackage | undefined {
  let canonical: CanonicalPackage | undefined;
  for (const locator of purls) {
    const raw = parsePurlOrThrow(locator);
    if (!isOsType(raw.type)) {
      canonical = genericCanonical(raw);
      continue;
    }
    // Syft's deb and apk purls are read in lower case
    const purl = raw.type !== 'rpm' ? parsePurlOrThrow(locator.toLowerCase()) : raw;
    const [version, epoch] = splitEpoch(purl.version);
    const distro = purl.qualifiers.distro;
    canonical = {
      type: purl.type,
      namespace: purl.namespace,
      name: purl.name,
      version,
      epoch: orUndefined(epoch || purl.qualifiers.epoch), // rpm: a qualifier
      architecture: orUndefined(purl.qualifiers.arch),
      subpath: orUndefined(purl.subpath),
      distro: distroFrom(distro, orUndefined(DISTRO_NAMES[distro ?? ''])),
      upstream: upstreamFrom(purl.qualifiers.upstream),
    };
  }
  return canonical;
}

// Syft's purl for an OS package
function anchorePurl(c: CanonicalPackage): PackageUrl {
  const q: Record<string, string> = {};
  if (c.architecture) q.arch = c.architecture;
  const release = c.distro?.fullVersion || c.distro?.version;
  if (release) {
    q.distro = `${c.distro!.name || c.namespace}-${release}`;
    if (c.upstream) q.upstream = c.upstream.version ? `${c.upstream.name}@${c.upstream.version}` : c.upstream.name;
  }
  const epoch = c.epoch && c.epoch !== '0' ? c.epoch : '';
  // the epoch of an rpm is a qualifier of its purl, not part of its version
  if (c.type === 'rpm' && epoch) q.epoch = epoch;
  const version = c.type === 'rpm' || !epoch ? c.version : `${epoch}:${c.version}`;
  return { type: c.type, namespace: c.namespace, name: c.name, version, qualifiers: q, subpath: c.subpath ?? '' };
}

// Syft's version (not its purl's) includes the epoch of an OS package, `go` before Go's own (stdlib), and is
// `UNKNOWN` when the purl has none; an image's (oci) is its tag
function syftVersion(c: CanonicalPackage): string | undefined {
  if (isOsType(c.type)) return c.epoch && c.epoch !== '0' ? `${c.epoch}:${c.version}` : c.version;
  if (c.type === 'oci') return undefined;
  if (!c.version) return 'UNKNOWN';
  return c.type === 'golang' && c.name === 'stdlib' ? `go${c.version}` : c.version;
}

// Without a canonical form (no usable purl) the package's purls are only written out again.
function fromCanonical(c: CanonicalPackage | undefined, { purls }: PackageView): PackageWrite {
  const own = c && (isOsType(c.type) ? anchorePurl(c) : genericPurl(c));
  return { purls: purls.map(p => own ?? parsePurlOrThrow(p)), version: c && purls.length ? syftVersion(c) : undefined };
}

export const anchoreDialect: Dialect = { toCanonical, fromCanonical };

export const anchoreSpdxPackage = converterFor(anchoreDialect, spdxAdapter);

export const anchoreSpdxProvider = createProviderFor(spdxAdapter, 'Anchore', anchoreSpdxPackage);

// In CycloneDX Syft also gives an OS package's cataloger and its source in properties (as seen on every Syft SBOM of
// public/sbom): Grype reads the source from them. A package of another tool gets those Syft can be sure of; not its
// locations, sizes, ...
const CATALOGERS: Record<string, [foundBy: string, metadataType: string]> = {
  deb: ['dpkg-db-cataloger', 'dpkg-db-entry'],
  apk: ['apk-db-cataloger', 'apk-db-entry'],
  rpm: ['rpm-db-cataloger', 'rpm-db-entry'],
};

function syftProperties(c: CanonicalPackage): { name: string; value: string }[] {
  const [foundBy, metadataType] = CATALOGERS[c.type];
  const dash = c.version.lastIndexOf('-');
  const metadata: Record<string, Record<string, string | undefined>> = {
    deb: { source: c.upstream?.name, sourceVersion: c.upstream?.version },
    apk: { originPackage: c.upstream?.name ?? c.name },
    rpm: { epoch: c.epoch && c.epoch !== '0' ? c.epoch : undefined, release: dash < 0 ? undefined : c.version.slice(dash + 1), sourceRpm: c.upstream?.name },
  };
  return [
    ['syft:package:foundBy', foundBy],
    ['syft:package:type', c.type],
    ['syft:package:metadataType', metadataType],
    ...Object.entries(metadata[c.type]).map(([key, value]) => [`syft:metadata:${key}`, value]),
  ]
    .filter(([, value]) => value)
    .map(([name, value]) => ({ name: name!, value: value! }));
}

const anchoreCycloneDx = converterFor(anchoreDialect, cycloneDxAdapter);

export const anchoreCycloneDxPackage: PackageConverter<CycloneDxComponent> = {
  toCanonical: anchoreCycloneDx.toCanonical,
  fromCanonical: (c, component) =>
    anchoreCycloneDx.fromCanonical!(c, component).map(written => {
      const syfts = written.properties?.some(p => p.name === 'syft:package:type');
      if (!c || !CATALOGERS[c.type] || syfts) return written;
      return { ...written, properties: [...(written.properties ?? []), ...syftProperties(c)] } as CycloneDxComponent;
    }),
};

// Syft lists the OS as a component of its own, with its `syft:distro:*` properties: made from the first OS package
// when there is none; another tool's gets the properties (its bom-ref, which the dependencies name, is kept)
export const anchoreCycloneDxProvider = createProviderFor(cycloneDxAdapter, 'Anchore', anchoreCycloneDxPackage, (entries, written) => {
  const distro = entries.find(e => e.canonical?.distro && CATALOGERS[e.canonical.type])?.canonical?.distro;
  const version = distro?.fullVersion || distro?.version;
  if (!distro || !version) return written;
  const properties = [
    { name: 'syft:distro:id', value: distro.name },
    ...(distro.codename ? [{ name: 'syft:distro:versionCodename', value: distro.codename }] : []),
    { name: 'syft:distro:versionID', value: version },
  ];
  const isOs = (c: CycloneDxComponent) => c.type === 'operating-system';
  if (!written.some(isOs)) {
    const os = { 'bom-ref': `os:${distro.name}@${version}`, type: 'operating-system', name: distro.name, version, properties };
    return [...written, os as CycloneDxComponent];
  }
  return written.map(c =>
    isOs(c) && !c.properties?.some(p => p.name === 'syft:distro:id')
      ? ({ ...c, properties: [...(c.properties ?? []), ...properties] } as CycloneDxComponent)
      : c
  );
});
