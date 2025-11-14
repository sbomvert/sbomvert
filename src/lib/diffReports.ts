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
  const arr = Array.from(unique)
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
    }
  >();

  // First pass: collect all packages and their metadata per tool
  sboms.forEach(sbom => {
    sbom.packages.forEach(pkg => {
      const key = `${pkg.name}@${pkg.version}`;
      const existing = packageMap.get(key);

      if (existing) {
        existing.foundInTools.push(sbom.tool);
        existing.metadataByTool.set(sbom.tool, extractMetadata(pkg));
      } else {
        const metadataByTool = new Map<string, IPackageMetadata>();
        metadataByTool.set(sbom.tool, extractMetadata(pkg));

        packageMap.set(key, {
          name: pkg.name,
          version: pkg.version,
          packageType: pkg.packageType,
          foundInTools: [sbom.tool],
          metadataByTool,
        });
      }
    });
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
  };
};
