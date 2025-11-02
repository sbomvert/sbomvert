import { IPurl } from '@/models/IPurl';
import { ISbom, ISbomPackage } from '@/models/ISbom';

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
        qualifiers[key] = value;
      });
    }

    return {
      scheme: 'pkg',
      type,
      namespace,
      name,
      version,
      qualifiers: Object.keys(qualifiers).length > 0 ? qualifiers : undefined,
      subpath: subpath?.substring(1),
    };
  } catch {
    return null;
  }
};

export const parseSpdxSbom = (data: unknown): ISbom | null => {
  // Implementation for parsing SPDX format
  // This is a placeholder - implement based on SPDX spec
  return null;
};

export const parseCycloneDxSbom = (data: unknown): ISbom | null => {
  // Implementation for parsing CycloneDX format
  // This is a placeholder - implement based on CycloneDX spec
  return null;
};
