import { ISbomPackage, IToolInfo } from './ISbom';

export interface IMultiToolComparison {
  imageId: string;
  tools: IToolInfo[];
  allPackages: Map<
    string,
    {
      package: ISbomPackage;
      foundInTools: string[];
    }
  >;
  statistics: {
    toolCounts: Record<string, number>;
    commonToAll: number;
    uniquePerTool: Record<string, number>;
  };
}
