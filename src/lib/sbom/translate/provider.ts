import { SpdxDocument, SpdxPackage } from '../spdx/types';
import { spdxAdapter } from './formats/spdx';
import { CanonicalDocument, CanonicalEntry, FormatAdapter, PackageConverter, Provider } from './types';

// A provider that converts package by package, in the format of `adapter`. The converter can depend
// on the SBOM it reads (and then cannot write one). `afterWrite` can still change the packages
// written, given the entries they came from.
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
    if (typeof converter === 'function' || !converter.fromCanonical) {
      throw new Error(`SBOMs cannot be written in the ${name} format`);
    }
    const { fromCanonical } = converter;
    const entries = structuredClone(packages);
    const written = entries.flatMap(e => fromCanonical(e.canonical, e.pkg));
    return adapter.withPackages(structuredClone(doc), afterWrite ? afterWrite(entries, written) : written);
  },
});

export const createProvider = (
  name: string,
  converter: PackageConverter | ((doc: SpdxDocument) => PackageConverter),
  afterWrite?: (entries: CanonicalEntry[], written: SpdxPackage[]) => SpdxPackage[]
): Provider => createProviderFor(spdxAdapter, name, converter, afterWrite);
