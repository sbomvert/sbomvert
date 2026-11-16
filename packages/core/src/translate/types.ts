import { PackageUrl } from '../purl/packageUrl';
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
  stage?: string; // the Dockerfile build stage it was installed in.
};

// A package as the tool wrote it, with its canonical form when it has a purl. `Pkg` is the package of
// the format the SBOM is in (an SPDX package, a CycloneDX component); SPDX is the default.
export type CanonicalEntry<Pkg = SpdxPackage> = { pkg: Pkg; canonical?: CanonicalPackage };

export type CanonicalDocument<Doc = SpdxDocument, Pkg = SpdxPackage> = { doc: Doc; packages: CanonicalEntry<Pkg>[] };

// What a tool's dialect reads of a package, whatever format it is in.
export type PackageView = { purls: string[]; version?: string };

// What a dialect writes for a package: one purl for each of the package's purls, and its version when
// the tool's version includes more than the package's did (an epoch).
export type PackageWrite = { purls: PackageUrl[]; version?: string };

// One tool's way of writing a package (how its purl is spelled, what its version includes), the same in
// every format. `fromCanonical` is absent for tools SBOMs are only read from.
export interface Dialect {
  toCanonical(pkg: PackageView): CanonicalPackage | undefined;
  fromCanonical?(canonical: CanonicalPackage | undefined, pkg: PackageView): PackageWrite;
  // packages the tool lists besides this one (Docker Scout lists the source package of a deb)
  extras?(canonical: CanonicalPackage | undefined, pkg: PackageView): PackageWrite[];
}

// One format (SPDX, CycloneDX): where it keeps what the dialects read and write.
export interface FormatAdapter<Doc, Pkg> {
  packages(doc: Doc): Pkg[];
  withPackages(doc: Doc, packages: Pkg[]): Doc;
  view(pkg: Pkg): PackageView;
  write(pkg: Pkg, write: PackageWrite): Pkg;
  // a new package made from `pkg`: same supplier, license, ... but its own id and name and a single purl
  copy(pkg: Pkg, idSuffix: string, name: string): Pkg;
}

// One tool's flavor of a single package. `fromCanonical` is absent for tools SBOMs are only read
// from; it returns several packages when the tool lists a package's source package as well.
// `pkg` is the package as the tool it came from wrote it: what the canonical form does not cover
// (supplier, hashes, ids, ...) is taken from it.
export interface PackageConverter<Pkg = SpdxPackage> {
  toCanonical(pkg: Pkg): CanonicalPackage | undefined;
  fromCanonical?(canonical: CanonicalPackage | undefined, pkg: Pkg): Pkg[];
}

// One SBOM tool's flavor of an SBOM format, to and from the canonical form.
export interface Provider<Doc = SpdxDocument, Pkg = SpdxPackage> {
  name: string;
  toCanonical(doc: Doc): CanonicalDocument<Doc, Pkg>;
  fromCanonical(canonical: CanonicalDocument<Doc, Pkg>): Doc;
}
