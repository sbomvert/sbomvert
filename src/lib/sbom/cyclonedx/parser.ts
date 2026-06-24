import { ISbom, ISbomPackage, IToolInfo } from '@/models/ISbom';
import { CycloneDxBom, CycloneDxComponent, CycloneDxLicense } from './types';

const getPackageTypeFromPurl = (purl?: string): ISbomPackage['packageType'] => {
  const type = purl?.match(/^pkg:([^/]+)\//)?.[1];

  switch (type) {
    case 'deb':
    case 'dpkg':
    case 'apk':
      return 'os';
    case 'npm':
      return 'npm';
    case 'pypi':
      return 'python';
    case 'maven':
      return 'maven';
    case 'nuget':
      return '.net';
    case 'cargo':
      return 'rust';
    case 'gem':
      return 'library';
    default:
      return 'generic';
  }
};

const getLicense = (licenses?: CycloneDxLicense[]): string | undefined => {
  const license = licenses?.[0];
  if (!license) return undefined;
  if ('expression' in license) return license.expression;
  if ('id' in license.license) return license.license.id;

  return license.license.name;
};

const flattenComponents = (components?: CycloneDxComponent[]): CycloneDxComponent[] => {
  return components?.flatMap(component => [component, ...flattenComponents(component.components)]) ?? [];
};

const getUniquePurlComponents = (components?: CycloneDxComponent[]): CycloneDxComponent[] => {
  const seen = new Set<string>();

  return flattenComponents(components).filter(component => {
    const key = component.purl;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const formatToolName = (toolName: string): string => {
  const baseName = toolName.split('.')[0] || 'Unknown';
  return baseName.charAt(0).toUpperCase() + baseName.slice(1);
};

const getTool = (data: CycloneDxBom, toolName: string): IToolInfo => {
  const tools = data.metadata?.tools;
  const firstTool = Array.isArray(tools)
    ? tools[0]
    : tools?.components?.[0] ?? tools?.services?.[0];
  const vendor = firstTool
    ? 'vendor' in firstTool
      ? firstTool.vendor
      : 'supplier' in firstTool
        ? firstTool.supplier?.name
        : undefined
    : undefined;

  return {
    name: firstTool?.name ?? formatToolName(toolName),
    version: firstTool?.version || 'unknown',
    vendor,
    format: 'CycloneDX',
  };
};

export const parseCycloneDxSbom = (
  data: CycloneDxBom,
  containerName: string,
  toolName: string
): ISbom | null => {
  try {
    if (data.bomFormat !== 'CycloneDX') return null;

    const toolInfo = getTool(data, toolName);
    const packages: ISbomPackage[] = getUniquePurlComponents(data.components).map(component => ({
      name: component.name,
      version: component.version || 'unknown',
      supplier: component.supplier?.name,
      license: getLicense(component.licenses),
      packageType: getPackageTypeFromPurl(component.purl),
      hash: component.hashes?.[0]
        ? `${component.hashes[0].alg.toLowerCase()}:${component.hashes[0].content}`
        : undefined,
      purl: component.purl,
      cpe: component.cpe,
    }));

    return {
      format: 'CycloneDX',
      tool: toolInfo.name,
      toolInfo,
      imageId: containerName,
      packages,
      timestamp: data.metadata?.timestamp ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error parsing CycloneDX SBOM:', error);
    return null;
  }
};
