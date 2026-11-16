import { PackageUrl } from '../purl/packageUrl';
import {
  DISTRO_NAMES, distroFrom, genericCanonical, genericPurl, isOsType, isGoStdlib, orUndefined, parsePurlOrThrow, splitEpoch, upstreamFrom,
} from './common';
import { converterFor } from './dialect';
import { spdxAdapter } from './formats/spdx';
import { createProviderFor } from './provider';
import { CanonicalPackage, Dialect, PackageView, PackageWrite } from './types';

// Google Artifact Analysis' flavor 
// Google writes `distro=<name>-<release>`, the epoch inside the version and `upstream=<name>[@<version>]`,
// and treats every Debian-like package as Debian. 

function toCanonical({ purls }: PackageView): CanonicalPackage | undefined {
  let canonical: CanonicalPackage | undefined;
  for (const locator of purls) {
    const purl = parsePurlOrThrow(locator);
    const q = purl.qualifiers;
    if (purl.type === 'deb') {
      const [version, epoch] = splitEpoch(purl.version);
      canonical = {
        type: 'deb',
        namespace: 'debian',
        name: purl.name,
        version,
        epoch: orUndefined(epoch),
        architecture: orUndefined((q.arch ?? '').toLowerCase()),
        subpath: orUndefined(purl.subpath),
        distro: distroFrom(q.distro, orUndefined(DISTRO_NAMES[q.distro ?? ''])),
        upstream: upstreamFrom(q.upstream),
      };
    } else if (purl.type === 'apk') {
      // the origin, when another package: Google's version of it is the package's own
      const [origin] = (q.upstream ?? '').split('@');
      canonical = {
        type: 'apk',
        namespace: purl.namespace,
        name: purl.name,
        version: purl.version,
        architecture: orUndefined(q.arch),
        distro: distroFrom(q.distro),
        upstream: origin && origin !== purl.name ? { name: origin } : undefined,
      };
    } else {
      canonical = genericCanonical(unfolded(purl));
    }
  }
  return canonical;
}

// The separator Google folds a namespace into the name with
const FOLDED: Record<string, string> = { golang: '/', npm: '/', composer: '/', maven: ':' };

// `github.com/agext/levenshtein@1.2.3` -> namespace `github.com/agext`, name `levenshtein`, version `v1.2.3`
function unfolded(purl: PackageUrl): PackageUrl {
  const sep = FOLDED[purl.type];
  const at = sep && !purl.namespace ? purl.name.lastIndexOf(sep) : -1;
  const split = at > 0 ? { namespace: purl.name.slice(0, at), name: purl.name.slice(at + 1) } : {};
  const version = purl.type === 'golang' && !isGoStdlib(purl) && /^\d/.test(purl.version) ? `v${purl.version}` : purl.version;
  return { ...purl, ...split, version };
}

function folded(purl: PackageUrl): PackageUrl {
  const sep = FOLDED[purl.type];
  const full = sep && purl.namespace ? `${purl.namespace}${sep}${purl.name}` : purl.name;
  const name = purl.type === 'golang' ? full.toLowerCase() : full;
  const version = purl.type === 'golang' || purl.type === 'composer' ? purl.version.replace(/^v(?=\d)/, '') : purl.version;
  return { ...purl, namespace: sep ? '' : purl.namespace, name, version };
}

// Google's purl for a deb or an apk
function googlePurl(c: CanonicalPackage): PackageUrl {
  const q: Record<string, string> = {};
  if (c.architecture) q.arch = c.architecture.toLowerCase();
  const release = c.distro?.fullVersion || c.distro?.version;
  if (c.distro) {
    const version = release?.split('.').slice(0, c.type === 'apk' ? 2 : 1).join('.');
    q.distro = version ? `${c.distro.name}-${version}` : c.distro.name;
  }
  if (c.type === 'apk') q.upstream = `${c.upstream?.name ?? c.name}@${c.version}`;
  else if (c.upstream) q.upstream = c.upstream.version ? `${c.upstream.name}@${c.upstream.version}` : c.upstream.name;
  const version = c.type === 'deb' && c.epoch && c.epoch !== '0' ? `${c.epoch}:${c.version}` : c.version;
  return { type: c.type, namespace: c.namespace, name: c.name, version, qualifiers: q, subpath: c.subpath ?? '' };
}

// Not Google's way with an rpm (none seen): its purl is left as the other tool wrote it. The version of a package
// not from the OS is its purl's (a Go one without its `v`).
function fromCanonical(c: CanonicalPackage | undefined, { purls }: PackageView): PackageWrite {
  const isOs = c && (c.type === 'deb' || c.type === 'apk');
  const own = c && (isOs ? googlePurl(c) : isOsType(c.type) ? undefined : folded(genericPurl(c)));
  const version = own && !isOs && own.type !== 'oci' && purls.length ? own.version : undefined;
  return { purls: purls.map(p => own ?? parsePurlOrThrow(p)), version };
}

export const googleDialect: Dialect = { toCanonical, fromCanonical };

export const googlePackage = converterFor(googleDialect, spdxAdapter);

export const googleProvider = createProviderFor(spdxAdapter, 'Google', googlePackage);
