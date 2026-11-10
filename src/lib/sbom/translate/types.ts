import { SpdxDocument, SpdxPackage } from '../spdx/types';

// One package in the form every tool is translated to and from: what its purl and SPDX package
// say, spelled out the same way whichever tool wrote them. `distro`, `upstream` and `epoch` only
// exist for OS packages (deb, apk).
export type CanonicalPackage = {
  type: string; // "deb", "apk", "npm", "pypi", ...
  namespace: string; // "debian", "alpine"
  name: string;
  version: string; // without the epoch
  epoch?: string;
  architecture?: string;
  subpath?: string;
  qualifiers?: Record<string, string>; // of a package that is not from an OS: its purl's, as they are
  distro?: {
    name: string; // "debian"
    version?: string; // the release as the tool gives it: "12", or "3.21.0" for Alpine
    fullVersion?: string; // "12.9", when the tool gives it
    codename?: string; // "bookworm"
  };
  upstream?: { name: string; version?: string }; // the source package it was built from
};

// An SPDX package as the tool wrote it, with its canonical form when it has a purl.
export type CanonicalEntry = { pkg: SpdxPackage; canonical?: CanonicalPackage };

export type CanonicalDocument = { doc: SpdxDocument; packages: CanonicalEntry[] };

// One tool's flavor of a single package. `fromCanonical` is absent for tools SBOMs are only read
// from; it returns several packages when the tool lists a package's source package as well.
// `pkg` is the package as the tool it came from wrote it: what the canonical form does not cover
// (supplier, hashes, ids, ...) is taken from it.
export interface PackageConverter {
  toCanonical(pkg: SpdxPackage): CanonicalPackage | undefined;
  fromCanonical?(canonical: CanonicalPackage | undefined, pkg: SpdxPackage): SpdxPackage[];
}

// One SBOM tool's flavor of SPDX, to and from the canonical form.
export interface Provider {
  name: string;
  toCanonical(doc: SpdxDocument): CanonicalDocument;
  fromCanonical(canonical: CanonicalDocument): SpdxDocument;
}
