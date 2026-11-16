import { CycloneDxComponent } from '../cyclonedx/types';
import { formatPackageUrl, PackageUrl, parsePackageUrl } from '../purl/packageUrl';
import { SpdxExternalRef, SpdxPackage } from '../spdx/types';
import {
  DISTRO_NAMES, familyOf, genericCanonical, genericPurl, isOsType, isGoStdlib, isPurlRef, orUndefined, OS_RELEASE_IDS, purlRef, splitEpoch, withRefs,
} from './common';
import { cycloneDxAdapter } from './formats/cyclonedx';
import { createProvider, createProviderFor } from './provider';
import { CanonicalEntry, CanonicalPackage, PackageConverter } from './types';

// Trivy's flavor of SPDX and CycloneDX. Trivy writes an OS package's purl as `distro=<name>-<version>` (Alpine:
// `distro=<version>`) and records where it was built from: in SPDX in `sourceInfo`, in CycloneDX in the
// `aquasecurity:trivy:Src*` properties. Both formats list the OS itself (an SPDX package, a CycloneDX component).
// The OS gets the full release ("12.9"), as Trivy writes it, not the major one.

const OS_PURPOSE = 'OPERATING-SYSTEM';
const SOURCE_PREFIX = 'built package from: ';

// The source a package was built from, as Trivy gives it: its name, and its version with the epoch
type Source = { name: string; version: string };

// The source package, when it is not the package itself: another name, or another version than
// the package's (with its epoch, which Trivy's source version includes).
function upstreamOf(source: Source | undefined, purl: PackageUrl): CanonicalPackage['upstream'] {
  if (!source) return undefined;
  const { name, version: sourceVersion } = source;
  const epoch = purl.qualifiers.epoch;
  const binaryVersion = epoch && epoch !== '0' ? `${epoch}:${purl.version}` : purl.version;
  if (sourceVersion !== binaryVersion) {
    // another epoch than the package's: the version alone is kept
    const other = sourceVersion.includes(':') && epoch && !sourceVersion.includes(`${epoch}:`);
    return { name, version: other ? sourceVersion.split(':')[1] : sourceVersion };
  }
  return name !== purl.name ? { name } : undefined;
}


// "chkconfig-1.24-2.0.1.el9.src.rpm" -> name and version-release: the source rpm, as Syft and Scout name it
const SOURCE_RPM = /^(.+)-([^-]+-[^-]+)\.src\.rpm$/;

// An rpm's source: Trivy gives its name and [epoch:]version-release, Syft its file name. Trivy's
// `modularitylabel` qualifier is not kept.
function rpmCanonical(source: Source | undefined, purl: PackageUrl, canonical: CanonicalPackage): void {
  const id = OS_RELEASE_IDS[purl.namespace] ?? purl.namespace;
  canonical.namespace = id;
  const distro = purl.qualifiers.distro ?? '';
  const fullVersion = distro.slice(distro.indexOf('-') + 1);
  if (distro.includes('-') && fullVersion) canonical.distro = { name: id, version: fullVersion.split('.')[0], fullVersion };
  if (source) canonical.upstream = { name: source.version ? `${source.name}-${splitEpoch(source.version)[0]}.src.rpm` : source.name };
}

function canonicalOf(purl: PackageUrl, source: Source | undefined): CanonicalPackage {
  if (!isOsType(purl.type)) {
    return genericCanonical(isGoStdlib(purl) ? { ...purl, version: purl.version.replace(/^v/, '') } : purl);
  }
  const q = purl.qualifiers;
  const canonical: CanonicalPackage = {
    type: purl.type,
    namespace: purl.namespace,
    name: purl.name,
    version: purl.version,
    epoch: orUndefined(q.epoch),
    architecture: orUndefined(q.arch),
    subpath: orUndefined(purl.subpath),
  };
  if (purl.type === 'deb') {
    const [name, fullVersion] = (q.distro ?? '').split('-');
    if (fullVersion) {
      canonical.distro = {
        name,
        version: fullVersion.split('.')[0],
        fullVersion,
        codename: DISTRO_NAMES[q.distro] ?? DISTRO_NAMES[q.distro.split('.')[0]], // Ubuntu's release is `26.04`
      };
    }
    canonical.upstream = upstreamOf(source, purl);
  } else if (purl.type === 'rpm') {
    rpmCanonical(source, purl, canonical);
  } else {
    if (q.distro) canonical.distro = { name: purl.namespace, version: q.distro };
    if (source && source.name !== purl.name) canonical.upstream = { name: source.name };
  }
  return canonical;
}

// the purl as Trivy writes it: arch, epoch and the distro as `<name>-<release>` (Alpine: `<release>`); an rpm's
// namespace and distro name are its OS family
function trivyPurl(c: CanonicalPackage): PackageUrl {
  const q: Record<string, string> = {};
  if (c.architecture) q.arch = c.architecture;
  if (c.epoch && c.epoch !== '0') q.epoch = c.epoch;
  const release = c.distro?.fullVersion || c.distro?.version;
  if (c.distro) {
    const name = familyOf(c.distro.name);
    if (c.type === 'apk') q.distro = c.distro.version ?? '';
    else q.distro = release ? `${name}-${release}` : name;
  }
  const namespace = familyOf(c.namespace);
  return { type: c.type, namespace, name: c.name, version: c.version, qualifiers: q, subpath: c.subpath ?? '' };
}

// Trivy lowercases Go module paths and writes Go's own version (stdlib) with a `v`, like the modules'
function trivyGenericPurl(c: CanonicalPackage): PackageUrl {
  const purl = genericPurl(c);
  if (purl.type !== 'golang') return purl;
  const version = isGoStdlib(purl) && purl.version ? `v${purl.version}` : purl.version;
  return { ...purl, namespace: purl.namespace.toLowerCase(), name: purl.name.toLowerCase(), version };
}

// What Trivy writes for a package, whatever the format: its purl; its version (an OS package's with its epoch; a
// package not from the OS its purl's, `null` for none; none at all for an image, oci, whose version is left as it
// is); for an OS package of another tool, the source it was built from (none for an rpm whose source rpm is not
// known: read back, it would become one).
type TrivyWrite = { purl: PackageUrl; version?: string | null; source?: Source };

function trivyWrite(c: CanonicalPackage, fromTrivy: boolean): TrivyWrite {
  if (!isOsType(c.type)) {
    const purl = trivyGenericPurl(c);
    return { purl, version: c.type === 'oci' ? undefined : purl.version || null };
  }
  const purl = trivyPurl(c);
  const epoch = purl.qualifiers.epoch;
  const version = epoch ? `${epoch}:${c.version}` : c.version;
  if (fromTrivy) return { purl, version };
  const sourceRpm = c.type === 'rpm' ? c.upstream?.name.match(SOURCE_RPM) : null;
  if (sourceRpm) return { purl, version, source: { name: sourceRpm[1], version: epoch ? `${epoch}:${sourceRpm[2]}` : sourceRpm[2] } };
  if (c.type === 'rpm') return { purl, version };
  if (c.upstream) return { purl, version, source: { name: c.upstream.name, version: c.upstream.version || version } };
  return { purl, version, source: { name: c.name, version } };
}

// The OS Trivy lists, from the first OS package of another tool: its family and release.
function operatingSystemOf(entries: CanonicalEntry<unknown>[]): { family: string; release: string } | undefined {
  const c = entries.find(e => e.canonical && isOsType(e.canonical.type))?.canonical;
  return c && { family: familyOf(c.namespace), release: c.distro?.fullVersion || c.distro?.version || c.version };
}

// SPDX

const sourceOf = (pkg: SpdxPackage): Source | undefined => {
  if (!pkg.sourceInfo?.startsWith(SOURCE_PREFIX)) return undefined;
  const [name, version = ''] = pkg.sourceInfo.slice(SOURCE_PREFIX.length).split(' ');
  return name ? { name, version } : undefined;
};

// the package's purl: its last purl reference
const purlOf = (pkg: SpdxPackage): PackageUrl | undefined => {
  const locator = (pkg.externalRefs ?? []).findLast(isPurlRef)?.referenceLocator;
  return (locator && parsePackageUrl(locator)) || undefined;
};

// a package Trivy wrote: its source, or the purpose Trivy alone gives every package (a package without a source,
// as Alpine's virtual ones, has none)
const isTrivys = (pkg: SpdxPackage) => !!pkg.sourceInfo?.startsWith(SOURCE_PREFIX) || pkg.primaryPackagePurpose === 'LIBRARY';

function fromCanonical(c: CanonicalPackage | undefined, pkg: SpdxPackage): SpdxPackage[] {
  if (!c) return [pkg];
  const fromTrivy = isTrivys(pkg);
  const { purl, version, source } = trivyWrite(c, fromTrivy);
  if (!isOsType(c.type)) {
    // a purl that already says this is left as Trivy wrote it (not re-encoded)
    const same = (r: SpdxExternalRef) => JSON.stringify(parsePackageUrl(r.referenceLocator)) === JSON.stringify(purl);
    const written = { ...pkg, externalRefs: (pkg.externalRefs ?? []).map(r => (isPurlRef(r) && !same(r) ? purlRef(purl) : r)) };
    if (version === undefined) return [written];
    const { versionInfo: _, ...unversioned } = written;
    return [version ? { ...written, versionInfo: version } : unversioned];
  }
  const written = { ...withRefs(pkg, purlRef(purl)), versionInfo: version! };
  if (fromTrivy) return [written];
  return [
    {
      ...written,
      attributionTexts: [`PkgID: ${source?.name ?? c.name}@${c.version}`, `PkgType: ${purl.namespace}`],
      primaryPackagePurpose: 'LIBRARY',
      ...(source && { sourceInfo: `${SOURCE_PREFIX}${source.name} ${source.version}` }),
    },
  ];
}

export const trivyPackage: PackageConverter = {
  toCanonical: pkg => {
    const purl = purlOf(pkg);
    return purl && canonicalOf(purl, sourceOf(pkg));
  },
  fromCanonical,
};

export const trivyProvider = createProvider('Trivy', trivyPackage, (entries, written) => {
  const os = !written.some(p => p.primaryPackagePurpose === OS_PURPOSE) && operatingSystemOf(entries);
  if (!os) return written;
  return [
    ...written,
    {
      name: os.family,
      SPDXID: 'SPDXRef-OperatingSystem',
      versionInfo: os.release,
      downloadLocation: 'NONE',
      filesAnalyzed: false,
      attributionTexts: ['Class: os-pkgs', `Type: ${os.family}`],
      primaryPackagePurpose: OS_PURPOSE,
    },
  ];
});

// CycloneDX: the source is in the `SrcName`, `SrcEpoch`, `SrcVersion` and `SrcRelease` properties (an Alpine
// source has no release), the OS is a component of type `operating-system`.

const PROPERTY = 'aquasecurity:trivy:';
const propertyOf = (c: CycloneDxComponent, name: string) => c.properties?.find(p => p.name === PROPERTY + name)?.value;

function cdxSourceOf(c: CycloneDxComponent): Source | undefined {
  const name = propertyOf(c, 'SrcName');
  if (!name) return undefined;
  const epoch = propertyOf(c, 'SrcEpoch');
  const release = propertyOf(c, 'SrcRelease');
  const version = `${epoch ? `${epoch}:` : ''}${propertyOf(c, 'SrcVersion') ?? ''}${release ? `-${release}` : ''}`;
  return { name, version };
}

// a source as Trivy's properties: a deb's or rpm's version splits into version and release at its last `-`
function sourceProperties(type: string, { name, version: full }: Source): { name: string; value: string }[] {
  const [version, epoch] = splitEpoch(full);
  const dash = type === 'apk' ? -1 : version.lastIndexOf('-');
  const props: [string, string][] = [
    ['SrcEpoch', epoch],
    ['SrcName', name],
    ['SrcRelease', dash < 0 ? '' : version.slice(dash + 1)],
    ['SrcVersion', dash < 0 ? version : version.slice(0, dash)],
  ];
  return props.filter(([, value]) => value).map(([key, value]) => ({ name: PROPERTY + key, value }));
}

const trivyCycloneDxPackage: PackageConverter<CycloneDxComponent> = {
  toCanonical(c) {
    const purl = c.purl ? parsePackageUrl(c.purl) : undefined;
    return purl ? canonicalOf(purl, cdxSourceOf(c)) : undefined;
  },

  fromCanonical(canonical, c) {
    if (!canonical || !c.purl) return [c];
    const fromTrivy = propertyOf(c, 'PkgID') !== undefined; // Trivy gives every package one
    const { purl, version, source } = trivyWrite(canonical, fromTrivy);
    // a purl that already says this is left as Trivy wrote it (not re-encoded)
    const same = JSON.stringify(parsePackageUrl(c.purl)) === JSON.stringify(purl);
    const written: CycloneDxComponent = { ...c, purl: same ? c.purl : formatPackageUrl(purl) };
    if (version === null) delete written.version;
    else if (version !== undefined) written.version = version;
    if (!isOsType(canonical.type) || fromTrivy) return [written];
    // an OS package of another tool: Trivy's properties after its own
    const withEpoch = canonical.epoch && canonical.epoch !== '0' ? `${canonical.epoch}:${canonical.version}` : canonical.version;
    const properties = [
      { name: `${PROPERTY}PkgID`, value: `${canonical.name}@${withEpoch}` },
      { name: `${PROPERTY}PkgType`, value: purl.namespace },
      ...(source ? sourceProperties(canonical.type, source) : []),
    ];
    return [{ ...written, type: 'library', properties: [...(c.properties ?? []), ...properties] } as CycloneDxComponent];
  },
};

export const trivyCycloneDxProvider = createProviderFor(cycloneDxAdapter, 'Trivy', trivyCycloneDxPackage, (entries, written) => {
  const os = !written.some(c => c.type === 'operating-system') && operatingSystemOf(entries);
  if (!os) return written;
  const component = {
    'bom-ref': 'operating-system',
    type: 'operating-system',
    name: os.family,
    version: os.release,
    properties: [
      { name: `${PROPERTY}Class`, value: 'os-pkgs' },
      { name: `${PROPERTY}Type`, value: os.family },
    ],
  } as CycloneDxComponent;
  return [component, ...written];
});
