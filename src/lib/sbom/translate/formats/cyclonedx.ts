import { formatPackageUrl } from '../../purl/packageUrl';
import { CycloneDxBom, CycloneDxComponent } from '../../cyclonedx/types';
import { FormatAdapter } from '../types';

// CycloneDX: the package's purl is its component's `purl`, the version its `version`. Components
// without a purl (files, ...) are left as they are; so are `bom-ref`s and the dependency graph, which
// only identify a component and need not follow its purl.
// Only the top-level components are read: Docker Scout nests its files under the packages.
export const cycloneDxAdapter: FormatAdapter<CycloneDxBom, CycloneDxComponent> = {
  packages: bom => bom.components ?? [],
  withPackages: (bom, components) => (bom.components ? { ...bom, components } : bom),

  view: c => ({ purls: c.purl ? [c.purl] : [], version: c.version }),

  write(c, { purls, version }) {
    if (!c.purl) return c;
    const written: CycloneDxComponent = { ...c, purl: formatPackageUrl(purls[0]) };
    if (version !== undefined) written.version = version;
    return written;
  },

  // the nested files and the CPE belong to the original package
  copy(c, idSuffix) {
    const { components: _, cpe: __, ...rest } = c;
    return c['bom-ref'] ? { ...rest, 'bom-ref': c['bom-ref'] + idSuffix } : rest;
  },
};
