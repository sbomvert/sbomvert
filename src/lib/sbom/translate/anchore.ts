import { PackageUrl } from '../purl/packageUrl';
import {
  DISTRO_NAMES, distroFrom, genericCanonical, genericPurl, isOsType, orUndefined, parsePurlOrThrow, splitEpoch, upstreamFrom,
} from './common';
import { converterFor } from './dialect';
import { cycloneDxAdapter } from './formats/cyclonedx';
import { spdxAdapter } from './formats/spdx';
import { createProviderFor } from './provider';
import { CanonicalPackage, Dialect, PackageView, PackageWrite } from './types';


function toCanonical({ purls }: PackageView): CanonicalPackage | undefined {
  let canonical: CanonicalPackage | undefined;
  for (const locator of purls) {
    const raw = parsePurlOrThrow(locator);
    if (!isOsType(raw.type)) {
      canonical = genericCanonical(raw);
      continue;
    }
    // Syft's OS purls are read in lower case
    const purl = parsePurlOrThrow(locator.toLowerCase());
    const [version, epoch] = splitEpoch(purl.version);
    const distro = purl.qualifiers.distro;
    canonical = {
      type: purl.type,
      namespace: purl.namespace,
      name: purl.name,
      version,
      epoch: orUndefined(epoch),
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
  if (c.distro?.version) {
    q.distro = `${c.distro.name || c.namespace}-${c.distro.version}`;
    if (c.upstream) q.upstream = c.upstream.version ? `${c.upstream.name}@${c.upstream.version}` : c.upstream.name;
  }
  const epoch = c.epoch && c.epoch !== '0' ? `${c.epoch}:` : '';
  return { type: c.type, namespace: c.namespace, name: c.name, version: epoch + c.version, qualifiers: q, subpath: c.subpath ?? '' };
}

// Without a canonical form (no usable purl) the package's purls are only written out again.
function fromCanonical(c: CanonicalPackage | undefined, { purls }: PackageView): PackageWrite {
  const isOs = c && isOsType(c.type);
  const own = c && (isOs ? anchorePurl(c) : genericPurl(c));
  // Syft's version includes the epoch
  return { purls: purls.map(p => own ?? parsePurlOrThrow(p)), version: isOs && purls.length ? own!.version : undefined };
}

export const anchoreDialect: Dialect = { toCanonical, fromCanonical };

export const anchoreSpdxPackage = converterFor(anchoreDialect, spdxAdapter);

export const anchoreSpdxProvider = createProviderFor(spdxAdapter, 'Anchore', anchoreSpdxPackage);

export const anchoreCycloneDxProvider = createProviderFor(
  cycloneDxAdapter,
  'Anchore',
  converterFor(anchoreDialect, cycloneDxAdapter)
);
