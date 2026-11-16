import { FormatAdapter, Dialect, PackageConverter } from './types';

// A tool's dialect on the packages of one format.
export const converterFor = <Doc, Pkg>(dialect: Dialect, adapter: FormatAdapter<Doc, Pkg>): PackageConverter<Pkg> => ({
  toCanonical: pkg => dialect.toCanonical(adapter.view(pkg)),
  fromCanonical:
    dialect.fromCanonical &&
    ((canonical, pkg) => {
      const view = adapter.view(pkg);
      const extras = dialect.extras?.(canonical, view) ?? [];
      return [
        adapter.write(pkg, dialect.fromCanonical!(canonical, view)),
        ...extras.map(w => adapter.write(adapter.copy(pkg, '-source', w.purls[0].name), w)),
      ];
    }),
});
