import { IPurl } from '@/models/IPurl';
import { ISbom, ISbomPackage, IToolInfo } from '@/models/ISbom';

export const parsePurl = (purlString?: string): IPurl | null => {
  if (!purlString) return null;

  try {
    const match = purlString.match(/^pkg:([^/]+)\/([^/]+)\/([^@]+)@([^?#]+)(\?[^#]+)?(#.+)?$/);
    if (!match) {
      const simpleMatch = purlString.match(/^pkg:([^/]+)\/([^@]+)@(.+)$/);
      if (simpleMatch) {
        return {
          scheme: 'pkg',
          type: simpleMatch[1],
          name: simpleMatch[2],
          version: simpleMatch[3],
        };
      }
      return null;
    }

    const [, type, namespace, name, version, qualifiersStr, subpath] = match;
    const qualifiers: Record<string, string> = {};

    if (qualifiersStr) {
      const pairs = qualifiersStr.substring(1).split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        qualifiers[decodeURIComponent(key)] = decodeURIComponent(value);
      });
    }

    return {
      scheme: 'pkg',
      type,
      namespace,
      name: decodeURIComponent(name),
      version,
      qualifiers: Object.keys(qualifiers).length > 0 ? qualifiers : undefined,
      subpath: subpath?.substring(1),
    };
  } catch {
    return null;
  }
};

interface SpdxPackage {
  name: string;
  SPDXID: string;
  versionInfo?: string;
  supplier?: string;
  licenseConcluded?: string;
  licenseDeclared?: string;
  externalRefs?: Array<{
    referenceCategory: string;
    referenceType: string;
    referenceLocator: string;
  }>;
  checksums?: Array<{
    algorithm: string;
    checksumValue: string;
  }>;
  attributionTexts?: string[];
  primaryPackagePurpose?: string;
}

interface SpdxDocument {
  spdxVersion: string;
  name: string;
  creationInfo: {
    creators: string[];
    created: string;
  };
  packages: SpdxPackage[];
}

const extractPackageType = (
  attributionTexts?: string[],
  purpose?: string
): ISbomPackage['packageType'] => {
  // Try to infer from attribution texts if provided
  if (attributionTexts) {
    const typeText = attributionTexts.find(text => text.startsWith('PkgType:'));
    if (typeText) {
      const type = typeText.replace('PkgType:', '').trim().toLowerCase();
      if (type === 'alpine' || type === 'apk') return 'os';
      if (type === 'npm') return 'npm';
      if (type === 'python' || type === 'pypi') return 'python';
      if (type === 'maven') return 'maven';
      if (type === 'gobinary') return 'binary';
    }
  }

  // Fallback to SPDX primaryPackagePurpose
  if (purpose === 'OPERATING-SYSTEM') return 'os';
  if (purpose === 'APPLICATION') return 'binary';
  if (purpose === 'LIBRARY') return 'library';

  return 'library';
};

export const parseSpdxSbom = (
  data: SpdxDocument,
  containerName: string,
): ISbom | null => {
  try {
    // Extract tool info from creators
    const tname = data.creationInfo.creators.find(c => c.startsWith('Tool:'))?.replace('Tool:', '').trim();
    const tvendor =data.creationInfo.creators.find(c => c.startsWith('Organization:'))?.replace('Organization:', '').trim(); 
    

    let toolVersion = 'unknown';
    let toolBaseName = tname ?? 'Unknown';

    if (tname) {
      const parts = tname.split('-');
      if (parts.length > 1) {
        toolVersion = parts.at(-1) ?? 'unknown';
        toolBaseName = parts.slice(0, -1).join('-');
      }
    }

    const toolName  = toolBaseName
    const vendor  = tvendor? tvendor : "Unknown"


    const toolInfo: IToolInfo = {
      name: toolName.charAt(0).toUpperCase() + toolName.slice(1),
      version: toolVersion,
      vendor: vendor,
      format: 'SPDX',
    };

    // Filter out container image and operating system packages
    const packages: ISbomPackage[] = data.packages
      .filter(pkg => {
        const isContainer = pkg.primaryPackagePurpose === 'CONTAINER';
        const isOS = pkg.primaryPackagePurpose === 'OPERATING-SYSTEM';
        const isApplication = pkg.primaryPackagePurpose === 'APPLICATION';
        return !isContainer && !isOS && (pkg.versionInfo || isApplication);
      })
      .map(pkg => {
        // Extract pURL from external refs
        const purlRef = pkg.externalRefs?.find(
          ref => ref.referenceType === 'purl' && ref.referenceCategory === 'PACKAGE-MANAGER'
        );

        // Extract CPE from external refs
        const cpeRef = pkg.externalRefs?.find(ref => ref.referenceType === 'cpe23Type');

        // Extract hash from checksums
        const hash = pkg.checksums?.[0]
          ? `${pkg.checksums[0].algorithm.toLowerCase()}:${pkg.checksums[0].checksumValue}`
          : undefined;

        // Extract supplier
        let supplier = pkg.supplier;
        if (supplier === 'NOASSERTION' || !supplier) {
          supplier = undefined;
        }

        // Extract license
        let license = pkg.licenseDeclared || pkg.licenseConcluded;
        if (license === 'NONE' || license === 'NOASSERTION') {
          license = undefined;
        }

        return {
          name: pkg.name,
          version: pkg.versionInfo || 'unknown',
          supplier,
          license,
          packageType: extractPackageType(pkg.attributionTexts, pkg.primaryPackagePurpose),
          hash,
          purl: purlRef?.referenceLocator,
          cpe: cpeRef?.referenceLocator,
        };
      });

    return {
      format: 'SPDX',
      tool: toolInfo.name,
      toolInfo,
      imageId: containerName,
      packages,
      timestamp: data.creationInfo.created,
    };
  } catch (error) {
    console.error('Error parsing SPDX SBOM:', error);
    return null;
  }
};

export const parseCycloneDxSbom = (
  data: unknown,
  containerName: string,
  toolName: string
): ISbom | null => {
  // Placeholder for CycloneDX parsing
  // Will be implemented when CycloneDX files are provided
  console.warn('CycloneDX parsing not yet implemented');
  return null;
};