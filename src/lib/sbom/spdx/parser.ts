import { InferPkgTypeFromPurl } from "../purl/converter";
import { LicenseInfo, PackageInfo, RichFile, RichPackage, SbomInfo } from '../analyzeTypes';
import { SpdxDocument, SpdxPackage } from "./types";

 const skip = new Set(['CONTAINER', 'OPERATING-SYSTEM']);

const getPackagePurl = (pkg: SpdxPackage): string | undefined => {
    return pkg.externalRefs?.find(r => r.referenceType === 'purl')?.referenceLocator;
};

const getAnalyzablePackages = (doc: SpdxDocument): SpdxPackage[] => {
    const seenPurls = new Set<string>();

    return doc.packages
        .filter(p => !skip.has(p.primaryPackagePurpose ?? '') && (p.versionInfo || p.primaryPackagePurpose === 'APPLICATION'))
        .filter(p => {
            const purl = getPackagePurl(p);
            if (!purl) return true;
            if (seenPurls.has(purl)) return false;
            seenPurls.add(purl);
            return true;
        });
};

export function cleanLicense(l?: string): string | undefined {
    if (!l || l === 'NOASSERTION' || l === 'NONE') return undefined;
    return l;
}

export function parseCreator(creators: string[]): { tool: string; toolVersion: string; vendor: string } {
    const toolEntry = creators.find(c => c.startsWith('Tool:'))?.replace('Tool:', '').trim() ?? '';
    const parts = toolEntry.split('-');
    const toolVersion = parts.length > 1 ? (parts.at(-1) ?? '') : '';
    const tool = parts.length > 1 ? parts.slice(0, -1).join('-') : toolEntry;
    const vendor = creators.find(c => c.startsWith('Organization:'))?.replace('Organization:', '').trim() ?? '';
    return { tool, toolVersion, vendor };
}


const GetLicenses = (doc: SpdxDocument) => (getAnalyzablePackages(doc)
        .reduce((prev: LicenseInfo, curr: SpdxPackage, _idx) => {

            if (cleanLicense(curr.licenseDeclared))
                return {
                    ...prev,
                    declared: prev.declared + 1
                }
            else if (cleanLicense(curr.licenseConcluded)) {
                return {
                    ...prev,
                    deducted: prev.deducted + 1
                }
            }
            else {
                return { ...prev, unknown: prev.unknown + 1 }
            }

        }, {
            declared: 0,
            deducted: 0,
            unknown: 0
        }))


const GroupPackages = (doc: SpdxDocument): PackageInfo => {
  return getAnalyzablePackages(doc)
    .reduce((prev: PackageInfo, curr: SpdxPackage) => {
      const ptype = InferPkgTypeFromPurl(
        getPackagePurl(curr) ?? ''
      );

      return {
        ...prev,
        [ptype]: Object.hasOwn(prev, ptype)
          ? prev[ptype] + 1
          : 1,
      };
    }, {} as PackageInfo);
};

export function AnalyzeSPDX(doc: SpdxDocument, imageId: string): { info: SbomInfo; packages: RichPackage[] } {

    const { tool, toolVersion, vendor } = parseCreator(doc.creationInfo.creators);

    const info: SbomInfo = {
        tool,
        toolVersion,
        vendor,
        format: 'SPDX',
        created: doc.creationInfo.created,
        imageId,
        spdxVersion: doc.spdxVersion,
        documentNamespace: doc.documentNamespace,
        totalPackages: 0,
        licenseInfo: GetLicenses(doc),
        packageInfo: GroupPackages(doc),
    };
    

    // Build file map: source reference → RichFile
    const fileMap = new Map<string, RichFile>();
    for (const f of doc.files ?? []) {
        const layerMatch = f.comment?.match(/layerID:\s*(sha256:[a-f0-9]+)/i);
        fileMap.set(f.SPDXID, {
            fileName: f.fileName,
            sourceRef: f.SPDXID,
            fileTypes: f.fileTypes,
            sha256: f.checksums?.find(c => c.algorithm === 'SHA256')?.checksumValue,
            sha1: f.checksums?.find(c => c.algorithm === 'SHA1')?.checksumValue,
            layerId: layerMatch?.[1],
        });
    }

    // Build package→files map from CONTAINS relationships
    const pkgFiles = new Map<string, RichFile[]>();
    for (const rel of doc.relationships ?? []) {
        if (rel.relationshipType !== 'CONTAINS') continue;
        const file = fileMap.get(rel.relatedSpdxElement);
        if (!file) continue;
        const existing = pkgFiles.get(rel.spdxElementId) ?? [];
        existing.push(file);
        pkgFiles.set(rel.spdxElementId, existing);
    }

   
    const packages: RichPackage[] = getAnalyzablePackages(doc)
        .map(p => {
            const purl = getPackagePurl(p);
            const cpes = p.externalRefs?.filter(r => r.referenceType === 'cpe23Type').map(r => r.referenceLocator) ?? [];
            const hash = p.checksums?.[0] ? `${p.checksums[0].algorithm.toLowerCase()}:${p.checksums[0].checksumValue}` : undefined;
            return {
                raw: p,
                sourceRef: p.SPDXID,
                name: p.name,
                version: p.versionInfo ?? 'unknown',
                pkgType: InferPkgTypeFromPurl(purl ?? ''),
                purl,
                cpes,
                license: cleanLicense(p.licenseDeclared) ?? cleanLicense(p.licenseConcluded),
                supplier: p.supplier === 'NOASSERTION' ? undefined : p.supplier,
                originator: p.originator === 'NOASSERTION' ? undefined : p.originator,
                downloadLocation: p.downloadLocation === 'NOASSERTION' || p.downloadLocation === 'NONE' ? undefined : p.downloadLocation,
                homepage: p.homepage,
                description: p.description,
                sourceInfo: p.sourceInfo,
                copyrightText: p.copyrightText === 'NOASSERTION' ? undefined : p.copyrightText,
                hash,
                files: pkgFiles.get(p.SPDXID) ?? [],
            };
        });

    info.totalPackages = packages.length;
    return { info, packages };
}
