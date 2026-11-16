import { PackageUrl } from '../purl/packageUrl';
import { SpdxPackage } from '../spdx/types';
import {
  DISTRO_NAMES, genericCanonical, genericPurl, isOsType, isPurlRef, orUndefined, parsePurlOrThrow, purlRef, splitEpoch,
  upstreamFrom,
} from './common';
import { converterFor } from './dialect';
import { cycloneDxAdapter } from './formats/cyclonedx';
import { spdxAdapter } from './formats/spdx';
import { createProviderFor } from './provider';
import { CanonicalPackage, Dialect, PackageConverter, PackageView, PackageWrite } from './types';

// Docker Scout's flavor of SPDX and CycloneDX.
// Scout writes the distro as `os_name`, `os_version` and `os_distro` (its codename). Has the epoch inside the version, no architecture and no upstream;


// Scout names Oracle Linux `oraclelinux`; the canonical form has the os-release id Syft uses, `ol`
const SCOUT_NAMES: Record<string, string> = { ol: 'oraclelinux' };
const CANONICAL_NAMES = Object.fromEntries(Object.entries(SCOUT_NAMES).map(([id, name]) => [name, id]));

function toCanonical({ purls }: PackageView): CanonicalPackage | undefined {
  let canonical: CanonicalPackage | undefined;
  for (const locator of purls) {
    const purl = parsePurlOrThrow(locator);
    const q = purl.qualifiers;
    if (!isOsType(purl.type)) {
      canonical = genericCanonical({ ...purl, version: canonicalVersion(purl) });
      continue;
    }
    const [version, epoch] = purl.type === 'apk' ? [purl.version, ''] : splitEpoch(purl.version);
    canonical = {
      type: purl.type,
      namespace: CANONICAL_NAMES[purl.namespace] ?? purl.namespace,
      name: purl.name,
      version,
      epoch: orUndefined(epoch),
      architecture: orUndefined(q.arch),
      subpath: orUndefined(purl.subpath),
      distro: q.os_name
        ? { name: CANONICAL_NAMES[q.os_name] ?? q.os_name, version: orUndefined(q.os_version), codename: orUndefined(q.os_distro) }
        : undefined,
      upstream: upstreamFrom(q.upstream),
      stage: orUndefined(q.stage),
    };
  }
  return canonical;
}

// the version as Syft writes it: a Go module's with its `v`, Go's own (stdlib) without, none for `UNKNOWN`
function canonicalVersion({ type, name, version }: PackageUrl): string {
  const bare = type === 'golang' ? version.replace(/^v/, '') : version;
  if (bare === 'UNKNOWN') return '';
  return type === 'golang' && name !== 'stdlib' ? `v${bare}` : bare;
}

// Scout's purl for a package that is not from the OS
function scoutGenericPurl(c: CanonicalPackage): PackageUrl {
  const purl = genericPurl(c);
  if (purl.type === 'golang') {
    purl.namespace = purl.namespace.toLowerCase();
    purl.name = purl.name.toLowerCase();
    purl.version = purl.version.replace(/^v/, '');
  }
  if (purl.type === 'composer') purl.version = purl.version.replace(/^v(?=\d)/, '');
  // seen on golang and maven only
  purl.version ||= 'UNKNOWN';
  return purl;
}

// Scout's os_version is the major version (Debian, Oracle Linux: `13`), the major and minor one for Alpine
// (`3.24`) and the whole one for Ubuntu (`26.04`). Seen on these four distros only; the others get the major.
function scoutOsVersion(name: string, version: string): string {
  if (name === 'ubuntu') return version;
  return version.split('.').slice(0, name === 'alpine' ? 2 : 1).join('.');
}

// Scout's purl for a package
function dockerPurl(c: CanonicalPackage, name = c.name): PackageUrl {
  const q: Record<string, string> = {};
  const namespace = SCOUT_NAMES[c.namespace] ?? c.namespace;
  if (c.architecture) q.arch = c.architecture;
  if (c.upstream) q.upstream = c.upstream.version ? `${c.upstream.name}@${c.upstream.version}` : c.upstream.name;
  if (c.distro) {
    const distro = SCOUT_NAMES[c.distro.name] ?? c.distro.name;
    const release = c.distro.fullVersion || c.distro.version;
    const osVersion = release ? scoutOsVersion(distro, release) : undefined;
    q.os_name = distro;
    const codename = c.distro.codename ?? (osVersion ? DISTRO_NAMES[`${distro}-${osVersion}`] : undefined);
    if (codename) q.os_distro = codename;
    if (osVersion) q.os_version = osVersion;
  }
  if (c.stage) q.stage = c.stage;
  const version = c.epoch && c.epoch !== '0' ? `${c.epoch}:${c.version}` : c.version;
  return { type: c.type, namespace, name, version, qualifiers: q, subpath: c.subpath ?? '' };
}

// Scout's version is its purl's, the epoch included; an image's (oci) is its tag
function fromCanonical(c: CanonicalPackage | undefined, { purls }: PackageView): PackageWrite {
  const own = c && (isOsType(c.type) ? dockerPurl(c) : scoutGenericPurl(c));
  return { purls: purls.map(p => own ?? parsePurlOrThrow(p)), version: own && own.type !== 'oci' && purls.length ? own.version : undefined };
}

// the source package is listed as a package of its own
function extras(c: CanonicalPackage | undefined): PackageWrite[] {
  if (!c || c.type !== 'deb' || !c.upstream || c.upstream.name === c.name) return [];
  // Syft's upstream version includes the epoch
  const own = c.upstream.version ? { version: c.upstream.version, epoch: undefined } : {};
  const source = dockerPurl({ ...c, ...own, architecture: undefined, upstream: undefined }, c.upstream.name);
  return [{ purls: [source], version: source.version }];
}

export const dockerDialect: Dialect = { toCanonical, fromCanonical, extras };

// the package as Scout lists it in SPDX: no attribution texts (Trivy's), no purpose; its id made distinct
function scoutPackage(pkg: SpdxPackage): SpdxPackage {
  if (pkg.attributionTexts === undefined) return pkg;
  const { attributionTexts: _, primaryPackagePurpose: __, ...rest } = pkg;
  return { ...rest, SPDXID: `${pkg.SPDXID}1234567780123456` };
}

const dockerSpdx = converterFor(dockerDialect, spdxAdapter);

// in SPDX, Scout's Go purls have a `v` before the version
const withGoV = (pkg: SpdxPackage): SpdxPackage => ({
  ...pkg,
  externalRefs: pkg.externalRefs?.map(r => {
    if (!isPurlRef(r) || !r.referenceLocator.startsWith('pkg:golang/')) return r;
    const purl = parsePurlOrThrow(r.referenceLocator);
    return purlRef({ ...purl, version: `v${purl.version}` });
  }),
});

export const dockerSpdxPackage: PackageConverter = {
  toCanonical: dockerSpdx.toCanonical,
  fromCanonical: (c, pkg) => dockerSpdx.fromCanonical!(c, scoutPackage(pkg)).map(withGoV),
};

export const dockerSpdxProvider = createProviderFor(spdxAdapter, 'Docker', dockerSpdxPackage);

export const dockerCycloneDxProvider = createProviderFor(
  cycloneDxAdapter,
  'Docker',
  converterFor(dockerDialect, cycloneDxAdapter)
);
