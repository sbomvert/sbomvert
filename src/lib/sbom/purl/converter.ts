import { PkgType } from "./types";

export function InferPkgTypeFromPurl(purl: string): PkgType {
  if (purl.includes('pkg:apk') || purl.includes('pkg:deb') || purl.includes('pkg:dpkg') || purl.includes('pkg:rpm')) return 'os';
  if (purl.includes('pkg:npm')) return 'npm';
  if (purl.includes('pkg:pypi')) return 'python';
  if (purl.includes('pkg:maven')) return 'maven';
  if (purl.includes('pkg:nuget')) return '.net';
  if (purl.includes('pkg:cargo')) return 'rust';
  return 'generic';
}