import { formatPackageUrl, PackageUrl, parsePackageUrl } from '../purl/packageUrl';
import { SpdxExternalRef, SpdxPackage } from '../spdx/types';
import { CanonicalPackage } from './types';


// release codenames 
export const DISTRO_NAMES: Record<string, string> = {
  'ubuntu-18.04': 'bionic',
  'ubuntu-20.04': 'focal',
  'ubuntu-22.04': 'jammy',
  'ubuntu-24.04': 'noble',
  'ubuntu-26.04': 'resolute',
  'debian-10': 'buster',
  'debian-11': 'bullseye',
  'debian-12': 'bookworm',
  'debian-13': 'trixie',
  'fedora-36': 'thirtysix',
  'fedora-37': 'thirtyseven',
  'fedora-38': 'thirtyeight',
  'centos-7': 'core',
  'centos-8': 'stream',
  'archlinux-rolling': 'rolling',
};

// Some tools name an rpm's distro by its OS family (`oracle`), while others use the os-release id 
// shortcut: the four families whose names differ that are known here;
const RPM_FAMILIES: Record<string, string> = { ol: 'oracle', rhel: 'redhat', amzn: 'amazon', almalinux: 'alma' };
export const OS_RELEASE_IDS = Object.fromEntries(Object.entries(RPM_FAMILIES).map(([id, family]) => [family, id]));
export const familyOf = (id: string) => RPM_FAMILIES[id] ?? id;

export const orUndefined = (s?: string) => s || undefined;

// Packages of a Linux distribution, which carry a distro (and, for the tools that read it, an architecture and
export const isOsType = (type: string) => type === 'deb' || type === 'apk' || type === 'rpm';

// Go's own packages: the canonical form has their version without the `v` of the Go modules.
export const isGoStdlib = (purl: { type: string; name: string }) => purl.type === 'golang' && purl.name === 'stdlib';

// FIXME(this may not be universally true): A package that is not from an OS: its purl is the canonical form, whichever tool wrote it.
export const genericCanonical = (purl: PackageUrl): CanonicalPackage => ({
  type: purl.type,
  namespace: purl.namespace,
  name: purl.name,
  version: purl.version,
  subpath: orUndefined(purl.subpath),
  qualifiers: purl.qualifiers,
});

export const genericPurl = (c: CanonicalPackage): PackageUrl => ({
  type: c.type,
  namespace: c.namespace,
  name: c.name,
  version: c.version,
  qualifiers: c.qualifiers ?? {},
  subpath: c.subpath ?? '',
});

export const isPurlRef = (r: SpdxExternalRef) =>
  r.referenceCategory === 'PACKAGE-MANAGER' && r.referenceType === 'purl';

export const purlRef = (purl: PackageUrl): SpdxExternalRef => ({
  referenceCategory: 'PACKAGE-MANAGER',
  referenceType: 'purl',
  referenceLocator: formatPackageUrl(purl),
});

// the purl as written when it says the same as the one to write (a tool's own spelling: `+` or `:` unescaped),
// else the one to write
export const keepSpellingIfSame = (written: string, purl: PackageUrl): string => {
  const formatted = formatPackageUrl(purl);
  const parsed = parsePackageUrl(written);
  return parsed && formatPackageUrl(parsed) === formatted ? written : formatted;
};

export const parsePurlOrThrow = (locator: string): PackageUrl => {
  const purl = parsePackageUrl(locator);
  if (!purl) throw new Error(`Invalid package URL: ${locator}`);
  return purl;
};

// the package with these as its only external references
export const withRefs = (pkg: SpdxPackage, ...refs: SpdxExternalRef[]): SpdxPackage => ({
  ...pkg,
  externalRefs: refs,
});

// "1:2.38" -> ["2.38", "1"]
export const splitEpoch = (version: string): [string, string] => {
  const parts = version.split(':');
  return parts.length === 1 ? [parts[0], ''] : [parts[1], parts[0]];
};

// "util-linux@2.38" -> ["util-linux", "2.38"]; "util-linux" -> ["util-linux"]
export const splitUpstream = (upstream: string | undefined): string[] =>
  upstream === undefined ? [] : upstream.split('@');

// "name@version" or "name"
export const upstreamFrom = (spec: string | undefined): CanonicalPackage['upstream'] => {
  const [name, version] = splitUpstream(spec);
  return name ? { name, version: orUndefined(version) } : undefined;
};

// "1.2-3+deb12u1" -> Debian 12: the release suffix of a Debian package version names the distro
export const distroFromVersion = (version: string | undefined): { distro: string; version: string } | undefined => {
  const match = version?.match(/deb(\d+)u/);
  return match ? { distro: 'debian', version: match[1] } : undefined;
};

// "debian-12" -> name and version
export const distroFrom = (spec: string | undefined, codename?: string): CanonicalPackage['distro'] => {
  if (!spec) return undefined;
  const dash = spec.indexOf('-');
  return dash < 0
    ? { name: spec, codename }
    : { name: spec.slice(0, dash), version: orUndefined(spec.slice(dash + 1)), codename };
};
