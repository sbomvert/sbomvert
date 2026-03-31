import { InferPkgTypeFromPurl } from "../purl/converter";
import { PkgType } from "../purl/types";
import { SpdxDocument, SpdxPackage } from "./types";

export interface RichPackage {
    raw: SpdxPackage;
    spdxId: string;
    name: string;
    version: string;
    pkgType: PkgType;
    purl?: string;
    cpes: string[];
    license?: string;
    supplier?: string;
    originator?: string;
    downloadLocation?: string;
    homepage?: string;
    description?: string;
    sourceInfo?: string;
    copyrightText?: string;
    hash?: string;
    files: RichFile[];
}

export interface RichFile {
    fileName: string;
    spdxId: string;
    fileTypes?: string[];
    sha256?: string;
    sha1?: string;
    layerId?: string; // extracted from comment "layerID: sha256:..."
}

export interface SbomInfo {
    tool: string;
    toolVersion: string;
    vendor: string;
    format: string;
    created: string;
    imageId: string;
    spdxVersion: string;
    documentNamespace?: string;
    totalPackages: number;
}


function cleanLicense(l?: string): string | undefined {
    if (!l || l === 'NOASSERTION' || l === 'NONE') return undefined;
    return l;
}

function parseCreator(creators: string[]): { tool: string; toolVersion: string; vendor: string } {
    const toolEntry = creators.find(c => c.startsWith('Tool:'))?.replace('Tool:', '').trim() ?? '';
    const parts = toolEntry.split('-');
    const toolVersion = parts.length > 1 ? (parts.at(-1) ?? '') : '';
    const tool = parts.length > 1 ? parts.slice(0, -1).join('-') : toolEntry;
    const vendor = creators.find(c => c.startsWith('Organization:'))?.replace('Organization:', '').trim() ?? '';
    return { tool, toolVersion, vendor };
}

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
    };

    // Build file map: SPDXID → RichFile
    const fileMap = new Map<string, RichFile>();
    for (const f of doc.files ?? []) {
        const layerMatch = f.comment?.match(/layerID:\s*(sha256:[a-f0-9]+)/i);
        fileMap.set(f.SPDXID, {
            fileName: f.fileName,
            spdxId: f.SPDXID,
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

    const skip = new Set(['CONTAINER', 'OPERATING-SYSTEM']);
    const packages: RichPackage[] = doc.packages
        .filter(p => !skip.has(p.primaryPackagePurpose ?? '') && (p.versionInfo || p.primaryPackagePurpose === 'APPLICATION'))
        .map(p => {
            const purl = p.externalRefs?.find(r => r.referenceType === 'purl')?.referenceLocator;
            const cpes = p.externalRefs?.filter(r => r.referenceType === 'cpe23Type').map(r => r.referenceLocator) ?? [];
            const hash = p.checksums?.[0] ? `${p.checksums[0].algorithm.toLowerCase()}:${p.checksums[0].checksumValue}` : undefined;
            return {
                raw: p,
                spdxId: p.SPDXID,
                name: p.name,
                version: p.versionInfo ?? 'unknown',
                pkgType: InferPkgTypeFromPurl(p.externalRefs?.find(r => r.referenceType === 'purl')?.referenceLocator ?? ''),
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