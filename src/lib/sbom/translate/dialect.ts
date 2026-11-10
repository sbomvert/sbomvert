import { FormatAdapter, Dialect, PackageConverter } from './types';

// A tool's dialect on the packages of one format.
export const converterFor = <Doc, Pkg>(dialect: Dialect, adapter: FormatAdapter<Doc, Pkg>): PackageConverter<Pkg> => ({
  toCanonical: pkg => dialect.toCanonical(adapter.view(pkg)),
  fromCanonical:
    dialect.fromCanonical &&
    ((canonical, pkg) => [adapter.write(pkg, dialect.fromCanonical!(canonical, adapter.view(pkg)))]),
});
