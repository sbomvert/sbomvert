import { SpdxDocument, SpdxPackage } from '../spdx/types';
import { formatPackageUrl, parsePackageUrl } from '../purl/packageUrl';
import { spdxAdapter } from './formats/spdx';
import { CanonicalDocument, CanonicalEntry, FormatAdapter, PackageConverter, Provider } from './types';

// A provider that converts package by package, in the format of `adapter`. The converter can depend
// on the SBOM it reads (when writing: the SBOM the canonical form was read from). `afterWrite` can still
// change the packages written, given the entries they came from. E.g., if the arch of a distro is available only in a package we can rewrite all other packages with that arch. 
export const createProviderFor = <Doc, Pkg>(
  adapter: FormatAdapter<Doc, Pkg>,
  name: string,
  converter: PackageConverter<Pkg> | ((doc: Doc) => PackageConverter<Pkg>),
  afterWrite?: (entries: CanonicalEntry<Pkg>[], written: Pkg[]) => Pkg[]
): Provider<Doc, Pkg> => ({
  name,

  toCanonical(doc: Doc): CanonicalDocument<Doc, Pkg> {
    const { toCanonical } = typeof converter === 'function' ? converter(doc) : converter;
    const packages = structuredClone(adapter.packages(doc)).map(pkg => ({ pkg, canonical: toCanonical(pkg) }));
    return { doc: structuredClone(doc), packages };
  },

  fromCanonical({ doc, packages }: CanonicalDocument<Doc, Pkg>): Doc {
    const { fromCanonical } = typeof converter === 'function' ? converter(doc) : converter;
    if (!fromCanonical) throw new Error(`SBOMs cannot be written in the ${name} format`);
    const entries = structuredClone(packages);
    const converted = entries.map(e => fromCanonical(e.canonical, e.pkg));
    // After the package itself come the others the tool lists with it (its source package): one that is
    // already listed, by another package or by the SBOM, is not listed again.
    const sourceKey = (pkg: Pkg) => adapter.view(pkg).purls.map(asSourcePurl).join(' ');
    const listed = new Set(converted.map(([main]) => sourceKey(main)));
    const written = converted.flatMap(([main, ...extras]) => [
      main,
      ...extras.filter(extra => !listed.has(sourceKey(extra)) && listed.add(sourceKey(extra))),
    ]);
    return adapter.withPackages(structuredClone(doc), afterWrite ? afterWrite(entries, written) : written);
  },
});

export const createProvider = (
  name: string,
  converter: PackageConverter | ((doc: SpdxDocument) => PackageConverter),
  afterWrite?: (entries: CanonicalEntry[], written: SpdxPackage[]) => SpdxPackage[]
): Provider => createProviderFor(spdxAdapter, name, converter, afterWrite);

// a purl as its source package would have it, in one spelling: without the qualifiers only a binary has
const asSourcePurl = (purl: string): string => {
  const parsed = parsePackageUrl(purl);
  if (!parsed) return purl;
  const { arch: _, upstream: __, stage: ___, ...qualifiers } = parsed.qualifiers;
  return formatPackageUrl({ ...parsed, qualifiers });
};
