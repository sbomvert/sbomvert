import { SpdxDocument, SpdxPackage } from '../../spdx/types';
import { isPurlRef, purlRef } from '../common';
import { FormatAdapter } from '../types';

// SPDX: the purls are the package's `purl` external references, the version its `versionInfo`.
export const spdxAdapter: FormatAdapter<SpdxDocument, SpdxPackage> = {
  packages: doc => doc.packages,
  withPackages: (doc, packages) => ({ ...doc, packages }),

  view: pkg => ({
    purls: (pkg.externalRefs ?? []).filter(isPurlRef).map(r => r.referenceLocator),
    version: pkg.versionInfo,
  }),

  // the other references (CPEs, ...) stay where they are
  write(pkg, { purls, version }) {
    let i = 0;
    const written: SpdxPackage = {
      ...pkg,
      externalRefs: (pkg.externalRefs ?? []).map(r => (isPurlRef(r) ? purlRef(purls[i++]) : r)),
    };
    if (version !== undefined) written.versionInfo = version;
    return written;
  },

  copy: (pkg, idSuffix) => ({
    ...pkg,
    SPDXID: pkg.SPDXID + idSuffix,
    externalRefs: (pkg.externalRefs ?? []).filter(isPurlRef).slice(0, 1),
  }),
};
