import { SpdxDocument } from '../spdx/types';
import { CanonicalDocument, CanonicalEntry, PackageConverter, Provider } from './types';
import { SpdxPackage } from '../spdx/types';

// A provider that converts package by package. The converter can depend on the SBOM it reads (and
// then cannot write one). `afterWrite` can still change the packages written, given the entries they
// came from.
export const createProvider = (
  name: string,
  converter: PackageConverter | ((doc: SpdxDocument) => PackageConverter),
  afterWrite?: (entries: CanonicalEntry[], written: SpdxPackage[]) => SpdxPackage[]
): Provider => ({
  name,

  toCanonical(doc: SpdxDocument): CanonicalDocument {
    const { toCanonical } = typeof converter === 'function' ? converter(doc) : converter;
    const packages = structuredClone(doc.packages).map(pkg => ({ pkg, canonical: toCanonical(pkg) }));
    return { doc: structuredClone(doc), packages };
  },

  fromCanonical({ doc, packages }: CanonicalDocument): SpdxDocument {
    if (typeof converter === 'function' || !converter.fromCanonical) {
      throw new Error(`SBOMs cannot be written in the ${name} format`);
    }
    const { fromCanonical } = converter;
    const entries = structuredClone(packages);
    const written = entries.flatMap(e => fromCanonical(e.canonical, e.pkg));
    return { ...structuredClone(doc), packages: afterWrite ? afterWrite(entries, written) : written };
  },
});
