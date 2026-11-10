import { ISbom, ISbomPackage, IToolInfo } from '@/models/ISbom';
import { LicenseInfo, PackageInfo, RichPackage, SbomInfo } from '@/lib/sbom/analyzeTypes';
import { CycloneDxBom, CycloneDxComponent, CycloneDxLicense } from './types';
import { capitalizeToolName } from '../utils';
import { InferPkgTypeFromPurl } from '../purl/converter';

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
    name: capitalizeToolName(firstTool?.name ?? (toolName.split('.')[0] || 'Unknown')),
    version: firstTool?.version || 'unknown',
    vendor,
    format: 'CycloneDX',
  };
};

const getCpes = (component: CycloneDxComponent): string[] => {
  return component.cpe ? [component.cpe] : [];
};

const getPackageInfo = (packages: RichPackage[]): PackageInfo => {
  return packages.reduce((info, pkg) => {
    info[pkg.pkgType] = (info[pkg.pkgType] ?? 0) + 1;
    return info;
  }, {} as PackageInfo);
};

const getLicenseInfo = (packages: RichPackage[]): LicenseInfo => ({
  declared: packages.filter(pkg => pkg.license).length,
  deducted: 0,
  unknown: packages.filter(pkg => !pkg.license).length,
});

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
      packageType: InferPkgTypeFromPurl(component.purl ?? ''),
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

export const AnalyzeCycloneDX = (
  data: CycloneDxBom,
  imageId: string,
  toolName: string
): { info: SbomInfo; packages: RichPackage[] } => {
  const toolInfo = getTool(data, toolName);

  const packages: RichPackage[] = getUniquePurlComponents(data.components).map(component => {
    const hash = component.hashes?.[0]
      ? `${component.hashes[0].alg.toLowerCase()}:${component.hashes[0].content}`
      : undefined;

    return {
      raw: component,
      sourceRef: component['bom-ref'] ?? component.name,
      name: component.name,
      version: component.version || 'unknown',
      pkgType: InferPkgTypeFromPurl(component.purl ?? ''),
      purl: component.purl,
      cpes: getCpes(component),
      license: getLicense(component.licenses),
      supplier: component.supplier?.name ?? component.publisher,
      originator: component.author,
      downloadLocation: component.externalReferences?.[0]?.url,
      homepage: component.externalReferences?.find(ref => ref.type === 'website')?.url,
      description: component.description,
      sourceInfo: component.publisher,
      copyrightText: component.copyright,
      hash,
      files: [],
    };
  });

  return {
    info: {
      tool: toolInfo.name,
      toolVersion: toolInfo.version ?? '',
      vendor: toolInfo.vendor ?? '',
      format: 'CycloneDX',
      created: data.metadata?.timestamp ?? new Date().toISOString(),
      imageId,
      spdxVersion: data.specVersion,
      totalPackages: packages.length,
      licenseInfo: getLicenseInfo(packages),
      packageInfo: getPackageInfo(packages),
    },
    packages,
  };
};
