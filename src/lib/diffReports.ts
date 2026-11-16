import { ISbom, ISbomPackage } from '@/models/ISbom';
import {
  IMultiToolComparison,
  IPackageComparison,
  IPackageMetadata,
} from '@/models/IComparisonResult';

const extractMetadata = (pkg: ISbom['packages'][0]): IPackageMetadata => ({
  supplier: pkg.supplier,
  license: pkg.license,
  hash: pkg.hash,
  purl: pkg.purl,
  cpe: pkg.cpe,
});

const getUniqueValues = (values: (string | undefined)[]): string[] => {
  const unique: Set<string> = new Set(
    values.filter((v): v is string => v !== undefined && v !== '')
  );
  const arr = Array.from(unique);
  return arr ?? [];
};

export const compareMultipleTools = (sboms: ISbom[]): IMultiToolComparison => {
  const packageMap = new Map<
    string,
    {
      name: string;
      version: string;
      packageType: ISbomPackage['packageType'];
      foundInTools: string[];
      metadataByTool: Map<string, IPackageMetadata>;
      keyed: boolean; // matched on its comparison key
      withoutPurl: boolean; // only packages without a purl: their type is not known
    }
  >();
  const infoByTool: Record<string, { packages: string[]; purls: string[] }> = {};

  // First pass: collect all packages and their metadata per tool
  sboms.forEach(sbom => {
    infoByTool[sbom.tool] = {
      packages: sbom.packages.map(pkg => `${pkg.name}@${pkg.version}`),
      purls: sbom.packages
        .map(pkg => pkg.purl)
        .filter((purl): purl is string => purl !== undefined && purl !== ''),
    };
    sbom.packages.forEach(pkg => {
      const key = pkg.key ?? `${pkg.name}@${pkg.version}`;
      const existing = packageMap.get(key);

      if (existing) {
        // a tool can list two packages with the same key (two copies of a library): it found the package once
        if (!existing.foundInTools.includes(sbom.tool)) existing.foundInTools.push(sbom.tool);
        existing.metadataByTool.set(sbom.tool, extractMetadata(pkg));
        existing.withoutPurl &&= !pkg.purl;
      } else {
        const metadataByTool = new Map<string, IPackageMetadata>();
        metadataByTool.set(sbom.tool, extractMetadata(pkg));

        packageMap.set(key, {
          name: pkg.name,
          version: pkg.version,
          packageType: pkg.packageType,
          foundInTools: [sbom.tool],
          metadataByTool,
          keyed: pkg.key !== undefined,
          withoutPurl: !pkg.purl,
        });
      }
    });
  });

  // A package without a purl (Microsoft's Alpine and rpm packages) has no type, so no comparison key: it joins the
  // keyed package of its name and version, when there is exactly one and its tools did not list it already.
  const nameVersion = (name: string, version: string) => `${name}@${version.replace(/^\d+:/, '').replace(/^v(?=\d)/, '')}`.toLowerCase();
  const keyedByNameVersion = new Map<string, string[]>();
  packageMap.forEach((pkg, key) => {
    if (!pkg.keyed) return;
    // a key ends in `<name>@<version>`, the name has no `/`
    const tail = key.slice(key.lastIndexOf('/') + 1);
    keyedByNameVersion.set(tail, [...(keyedByNameVersion.get(tail) ?? []), key]);
  });
  packageMap.forEach((pkg, key) => {
    if (!pkg.withoutPurl) return;
    const matches = keyedByNameVersion.get(nameVersion(pkg.name, pkg.version)) ?? [];
    const target = matches.length === 1 ? packageMap.get(matches[0])! : undefined;
    if (!target || pkg.foundInTools.some(tool => target.foundInTools.includes(tool))) return;
    target.foundInTools.push(...pkg.foundInTools);
    pkg.metadataByTool.forEach((metadata, tool) => target.metadataByTool.set(tool, metadata));
    packageMap.delete(key);
  });

  // Second pass: analyze metadata and create final package comparisons
  const allPackages = new Map<string, IPackageComparison>();
  let packagesWithConflicts = 0;

  packageMap.forEach((pkgData, key) => {
    const allMetadata = Array.from(pkgData.metadataByTool.values());

    const uniqueSuppliers = getUniqueValues(allMetadata.map(m => m.supplier));
    const uniqueLicenses = getUniqueValues(allMetadata.map(m => m.license));
    const uniquePurls = getUniqueValues(allMetadata.map(m => m.purl));
    const uniqueCpes = getUniqueValues(allMetadata.map(m => m.cpe));
    const uniqueHashes = getUniqueValues(allMetadata.map(m => m.hash));

    const hasMetadataConflicts =
      uniqueSuppliers.length > 1 ||
      uniqueLicenses.length > 1 ||
      uniquePurls.length > 1 ||
      uniqueCpes.length > 1 ||
      uniqueHashes.length > 1;

    if (hasMetadataConflicts) {
      packagesWithConflicts++;
    }

    allPackages.set(key, {
      name: pkgData.name,
      version: pkgData.version,
      packageType: pkgData.packageType,
      foundInTools: pkgData.foundInTools,
      metadataByTool: pkgData.metadataByTool,
      hasMetadataConflicts,
      uniqueSuppliers,
      uniqueLicenses,
      uniquePurls,
      uniqueCpes,
      uniqueHashes,
    });
  });

  // Calculate statistics
  const toolCounts: Record<string, number> = {};
  const uniquePerTool: Record<string, number> = {};

  sboms.forEach(sbom => {
    toolCounts[sbom.tool] = sbom.packages.length;
    uniquePerTool[sbom.tool] = 0;
  });

  let commonToAll = 0;
  allPackages.forEach(({ foundInTools }) => {
    if (foundInTools.length === sboms.length) {
      commonToAll++;
    } else if (foundInTools.length === 1) {
      uniquePerTool[foundInTools[0]]++;
    }
  });

  return {
    imageId: sboms[0].imageId,
    tools: sboms.map(s => s.toolInfo),
    allPackages,
    statistics: {
      toolCounts,
      commonToAll,
      uniquePerTool,
      packagesWithConflicts,
    },
    infoByTool,
  };
};
