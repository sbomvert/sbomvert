import { ISbom } from '@/models/ISbom';
import { IMultiToolComparison } from '@/models/IComparisonResult';

export const compareMultipleTools = (sboms: ISbom[]): IMultiToolComparison => {
  const allPackages = new Map<
    string,
    { package: ISbom['packages'][0]; foundInTools: string[] }
  >();

  sboms.forEach(sbom => {
    sbom.packages.forEach(pkg => {
      const key = `${pkg.name}@${pkg.version}`;
      const existing = allPackages.get(key);

      if (existing) {
        existing.foundInTools.push(sbom.tool);
      } else {
        allPackages.set(key, {
          package: pkg,
          foundInTools: [sbom.tool],
        });
      }
    });
  });

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
    },
  };
};