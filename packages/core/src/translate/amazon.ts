import { CycloneDxBom, CycloneDxComponent } from '../cyclonedx/types';
import { PackageUrl, parsePackageUrl } from '../purl/packageUrl';
import { DISTRO_NAMES, distroFromVersion, familyOf, OS_RELEASE_IDS, genericCanonical, genericPurl, isOsType, orUndefined, parsePurlOrThrow, splitEpoch } from './common';
import { converterFor } from './dialect';
import { cycloneDxAdapter } from './formats/cyclonedx';
import { spdxAdapter } from './formats/spdx';
import { createProviderFor } from './provider';
import { CanonicalPackage, Dialect, FormatAdapter, PackageView, PackageWrite } from './types';

// Amazon Inspector writes `pkg:dpkg/` and `pkg:apk/` purls without a namespace and without the distro, so the namespace is assumed and the distro comes from the package versions.


const amazonDialect = (distro: string, release: string): Dialect => ({
  toCanonical({ purls }: PackageView): CanonicalPackage | undefined {
    let canonical: CanonicalPackage | undefined;
    for (const locator of purls) {
      const purl = parsePurlOrThrow(locator);
      const architecture = orUndefined((purl.qualifiers.arch ?? '').toLowerCase());
      if (purl.type === 'dpkg') {
        canonical = {
          type: 'deb',
          namespace: 'debian', // FIXME: (debian) should be fetched via other mechanisms
          name: purl.name,
          version: purl.version.replace(/-null$/, ''),
          epoch: orUndefined(purl.qualifiers.epoch),
          architecture,
          subpath: orUndefined(purl.subpath),
          distro: { name: distro || 'debian', version: orUndefined(distro ? release : '') },
        };
      } else if (purl.type === 'apk') {
        canonical = {
          type: 'apk',
          namespace: 'alpine', // FIXME: (debian) should be fetched via other mechanisms
          name: purl.name,
          version: purl.version.replace(/-null$/, ''),
          epoch: purl.qualifiers.epoch === '0' ? undefined : orUndefined(purl.qualifiers.epoch),
          architecture,
          subpath: orUndefined(purl.subpath),
          distro: distro ? { name: distro, version: orUndefined(release) } : undefined,
        };
      } else {
        canonical = genericCanonical(purl);
      }
    }
    return canonical;
  },
  fromCanonical,
  extras,
});

// Inspector's purl for a deb or an apk (or its source package: `name`, `version` and `epoch` the source's)
function amazonPurl(c: CanonicalPackage, name = c.name, version = c.version, epoch = c.epoch): PackageUrl {
  const q: Record<string, string> = {};
  if (c.architecture) q.arch = c.architecture.toUpperCase();
  q.epoch = c.type === 'deb' ? epoch || '0' : '0';
  q.upstream = `${name}-${version}.src.${c.type === 'deb' ? 'dpkg' : 'apk'}`;
  return { type: c.type === 'deb' ? 'dpkg' : c.type, namespace: '', name, version, qualifiers: q, subpath: c.subpath ?? '' };
}

// a version as Inspector writes it: `-null` after one without a revision (`3.134-null`, an Alpine `20250715.202522-null`)
const withNull = (version: string) => (version.includes('-') ? version : `${version}-null`);

// a deb's version and epoch as Inspector writes them: its source's
function sourceVersion(c: CanonicalPackage): [version: string, epoch?: string] {
  const [version, epoch] = c.upstream?.version ? splitEpoch(c.upstream.version) : [c.version, c.epoch];
  return [withNull(version), epoch];
}

// Not Inspector's way with an rpm (none seen): its purl is left as the other tool wrote it.
function fromCanonical(c: CanonicalPackage | undefined, { purls }: PackageView): PackageWrite {
  const isOs = c && (c.type === 'deb' || c.type === 'apk');
  let own = c && (isOs ? amazonPurl(c, c.name, ...(c.type === 'deb' ? sourceVersion(c) : [withNull(c.version)])) : isOsType(c.type) ? undefined : genericPurl(c));
  if (own?.type === 'composer') own = { ...own, version: own.version.replace(/^v(?=\d)/, '') };
  const version = own && own.type !== 'oci' && purls.length ? own.version : undefined;
  return { purls: purls.map(p => own ?? parsePurlOrThrow(p)), version };
}

// the source package, listed as a package of its own
function extras(c: CanonicalPackage | undefined): PackageWrite[] {
  if (!c || (c.type !== 'deb' && c.type !== 'apk') || !c.upstream || c.upstream.name === c.name) return [];
  const [version, epoch] = c.type === 'deb' ? sourceVersion(c) : [withNull(c.version)];
  const source = amazonPurl(c, c.upstream.name, version, epoch);
  return [{ purls: [source], version }];
}

// Inspector does not say which distro an image is: the first package version that does is used
const dialectFor = (versions: (string | undefined)[]) => {
  const os = versions.map(distroFromVersion).find(Boolean);
  return amazonDialect(os?.distro ?? '', os?.version ?? '');
};

export const amazonProvider = createProviderFor(spdxAdapter, 'Amazon', doc =>
  converterFor(dialectFor(doc.packages.map(p => p.versionInfo)), spdxAdapter)
);

// Each source package is a
// top-level component, the binaries built from it nested under it with `source=<source>` (a binary built from
// a source of its own name is the top-level component itself). The OS is an `operating-system` component
// ("Debian GNU/Linux" 13, "Alpine Linux" 3.24.4). An rpm (mysql:26.10.0, Oracle Linux 9.8) is flat, its purl
// `pkg:rpm/oracle/<name>@<version-release>?arch=<arch>&distro=9.8&epoch=<epoch, 0 when none>&source=<source rpm file>`. As in the SPDX export, a source-only top-level component (gcc-14)
// cannot be told from a package and is read as one.
const withEpoch = (version: string, epoch?: string) => (epoch && epoch !== '0' ? `${epoch}:${version}` : version);

const sbomgenDialect = (bom: CycloneDxBom): Dialect => {
  const os = bom.components?.find(c => c.type === 'operating-system');
  const release = os?.version;
  // a source's version, from its top-level component: nested binaries do not give it
  const sources = new Map<string, string>();
  for (const c of bom.components ?? []) {
    const p = c.purl && parsePackageUrl(c.purl);
    if (p && c.components?.length) sources.set(`${p.type}/${p.name}`, withEpoch(p.version, p.qualifiers.epoch));
  }
  return {
    toCanonical({ purls }) {
      if (!purls.length) return undefined;
      const purl = parsePurlOrThrow(purls[0]);
      const { arch, distro, epoch, source } = purl.qualifiers;
      if (purl.type === 'rpm') {
        const id = OS_RELEASE_IDS[purl.namespace] ?? purl.namespace;
        return {
          type: 'rpm',
          namespace: id,
          name: purl.name,
          version: purl.version,
          epoch: epoch && epoch !== '0' ? epoch : undefined,
          architecture: orUndefined(arch),
          subpath: orUndefined(purl.subpath),
          distro: distro ? { name: id, version: distro.split('.')[0], fullVersion: distro } : undefined,
          upstream: source ? { name: source } : undefined,
        };
      }
      if (purl.type !== 'deb' && purl.type !== 'apk') return genericCanonical(purl);
      // the source's version only when it is not the package's, as the other tools have it
      const sourceVersion = source ? sources.get(`${purl.type}/${source}`) : undefined;
      return {
        type: purl.type,
        namespace: purl.namespace,
        name: purl.name,
        version: purl.version,
        epoch: epoch && epoch !== '0' ? epoch : undefined,
        architecture: orUndefined(arch),
        subpath: orUndefined(purl.subpath),
        distro: purl.type === 'deb'
          ? { name: 'debian', version: orUndefined(release), codename: orUndefined(distro) }
          : { name: 'alpine', version: orUndefined(distro ?? release) },
        upstream: source ? { name: source, version: sourceVersion === withEpoch(purl.version, epoch) ? undefined : sourceVersion } : undefined,
      };
    },
    fromCanonical: (c, { purls }) => {
      const own = c && (isOsType(c.type) ? sbomgenPurl(c) : genericPurl(c));
      return { purls: purls.map(p => own ?? parsePurlOrThrow(p)), version: own && purls.length && own.version ? own.version : undefined };
    },
    extras(c) {
      if (!c || (c.type !== 'deb' && c.type !== 'apk') || !c.upstream || c.upstream.name === c.name) return [];
      // no source version: the package's, epoch included
      const [version, epoch] = c.upstream.version ? splitEpoch(c.upstream.version) : [c.version, c.epoch ?? ''];
      const source = sbomgenPurl({ ...c, name: c.upstream.name, version, epoch: orUndefined(epoch), upstream: undefined });
      return [{ purls: [source], version }];
    },
  };
};

function sbomgenPurl(c: CanonicalPackage): PackageUrl {
  const q: Record<string, string> = {};
  if (c.architecture) q.arch = c.architecture;
  // an rpm's source is its source rpm's file name, as Syft's `upstream`
  if (c.type === 'rpm') {
    const distro = c.distro?.fullVersion ?? c.distro?.version;
    if (distro) q.distro = distro;
    q.epoch = c.epoch || '0';
    if (c.upstream) q.source = c.upstream.name;
    return { type: 'rpm', namespace: familyOf(c.namespace), name: c.name, version: c.version, qualifiers: q, subpath: c.subpath ?? '' };
  }
  if (c.type === 'deb') {
    const codename = c.distro?.codename ?? (c.distro?.version ? DISTRO_NAMES[`debian-${c.distro.version.split('.')[0]}`] : undefined);
    if (codename) q.distro = codename;
    q.epoch = c.epoch || '0';
  } else if (c.distro?.fullVersion ?? c.distro?.version) {
    q.distro = (c.distro.fullVersion ?? c.distro.version)!;
  }
  if (c.upstream && c.upstream.name !== c.name) q.source = c.upstream.name;
  return { type: c.type, namespace: c.type === 'deb' ? 'debian' : 'alpine', name: c.name, version: c.version, qualifiers: q, subpath: c.subpath ?? '' };
}

// Sbomgen's components: the binaries nested under their source, read and written as a flat list
const sourceOf = (c: CycloneDxComponent) => {
  const p = c.purl ? parsePackageUrl(c.purl) : null;
  return p?.qualifiers.source ? `${p.type}/${p.qualifiers.source}` : undefined;
};
const sbomgenAdapter: FormatAdapter<CycloneDxBom, CycloneDxComponent> = {
  ...cycloneDxAdapter,
  packages: bom => (bom.components ?? []).flatMap(({ components, ...c }) => [c, ...(components ?? []).filter(k => k.purl)]),
  withPackages(bom, components) {
    const flat = components.map(({ components: _, ...c }) => c);
    const parents = new Map<string, CycloneDxComponent>();
    for (const c of flat) {
      const p = c.purl ? parsePackageUrl(c.purl) : null;
      if (p && !sourceOf(c)) parents.set(`${p.type}/${p.name}`, c);
    }
    const top = flat.filter(c => {
      const parent = sourceOf(c) && parents.get(sourceOf(c)!);
      if (parent) (parent.components ??= []).push(c);
      return !parent;
    });
    return cycloneDxAdapter.withPackages(bom, top);
  },
};

export const amazonCycloneDxProvider = createProviderFor(sbomgenAdapter, 'Amazon', (bom: CycloneDxBom) =>
  converterFor(sbomgenDialect(bom), sbomgenAdapter)
);
