'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ExternalLink, FileText,
  Shield, Hash, Tag, Package, Info, ChevronRight, Copy, Check,
} from 'lucide-react';
import { cn, getPackageTypeColor } from '@/lib/utils';
import { formatContainerName } from '@/lib/container/containerUtils';
import { BackButton } from '@/components/button/BackButton';
import { PkgType } from '@/lib/sbom/purl/types';
import { InferPkgTypeFromPurl } from '@/lib/sbom/purl/converter';

// ─── Raw SPDX types (richer than ISbom) ──────────────────────────────────────

interface SpdxChecksum { algorithm: string; checksumValue: string; }
interface SpdxExternalRef { referenceCategory: string; referenceType: string; referenceLocator: string; }

interface SpdxPackage {
  name: string;
  SPDXID: string;
  versionInfo?: string;
  supplier?: string;
  originator?: string;
  downloadLocation?: string;
  homepage?: string;
  sourceInfo?: string;
  description?: string;
  comment?: string;
  copyrightText?: string;
  licenseConcluded?: string;
  licenseDeclared?: string;
  filesAnalyzed?: boolean;
  primaryPackagePurpose?: string;
  packageVerificationCode?: { packageVerificationCodeValue: string };
  checksums?: SpdxChecksum[];
  externalRefs?: SpdxExternalRef[];
  attributionTexts?: string[];
  annotations?: Array<{ annotator: string; comment: string }>;
}

interface SpdxFile {
  fileName: string;
  SPDXID: string;
  fileTypes?: string[];
  checksums?: SpdxChecksum[];
  licenseConcluded?: string;
  licenseInfoInFiles?: string[];
  copyrightText?: string;
  comment?: string; // contains layerID
}

interface SpdxRelationship {
  spdxElementId: string;
  relatedSpdxElement: string;
  relationshipType: string;
}

interface SpdxDocument {
  spdxVersion: string;
  name: string;
  documentNamespace?: string;
  dataLicense?: string;
  creationInfo: { creators: string[]; created: string; licenseListVersion?: string; };
  packages: SpdxPackage[];
  files?: SpdxFile[];
  relationships?: SpdxRelationship[];
}

// ─── Derived types ────────────────────────────────────────────────────────────



interface RichPackage {
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

interface RichFile {
  fileName: string;
  spdxId: string;
  fileTypes?: string[];
  sha256?: string;
  sha1?: string;
  layerId?: string; // extracted from comment "layerID: sha256:..."
}

interface SbomInfo {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function parseDocument(doc: SpdxDocument, imageId: string): { info: SbomInfo; packages: RichPackage[] } {
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
      const purl = p.externalRefs?.find(r => r.referenceType === 'purl' && r.referenceCategory === 'PACKAGE-MANAGER')?.referenceLocator;
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

// ─── Small UI primitives ──────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function MetaRow({ label, value, mono, href }: { label: string; value?: string | null; mono?: boolean; href?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-gray-50 dark:border-gray-700/40 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider self-start pt-0.5">{label}</span>
      <div className="flex items-start gap-1.5 min-w-0">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className={cn('text-xs text-indigo-600 dark:text-indigo-400 hover:underline break-all', mono && 'font-mono')}>
            {value}
          </a>
        ) : (
          <span className={cn('text-xs text-gray-700 dark:text-gray-300 break-all', mono && 'font-mono')}>{value}</span>
        )}
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide', className)}>
      {children}
    </span>
  );
}

// ─── Package drawer ───────────────────────────────────────────────────────────

function PackageDrawer({ pkg, onClose }: { pkg: RichPackage; onClose: () => void }) {
  const purlHref = pkg.purl ? `https://github.com/package-url/purl-spec` : undefined;
  const nvdHref = pkg.cpes[0] ? `https://nvd.nist.gov/products/cpe/search/results?keyword=${encodeURIComponent(pkg.name)}` : undefined;

  // Group CPEs to avoid listing all of them
  const uniqueCpes = [...new Set(pkg.cpes)];

  // Unique layer IDs from files
  const layerIds = [...new Set(pkg.files.map(f => f.layerId).filter(Boolean))] as string[];

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-100 dark:border-gray-700 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={getPackageTypeColor(pkg.pkgType)}>{pkg.pkgType}</Badge>
            {pkg.license && (
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {pkg.license}
              </Badge>
            )}
          </div>
          <h2 className="font-bold text-gray-900 dark:text-white text-lg truncate">{pkg.name}</h2>
          <p className="text-sm text-gray-400 font-mono">{pkg.version}</p>
        </div>
        <button onClick={onClose}
          className="shrink-0 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

        {/* Description */}
        {pkg.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{pkg.description}</p>
        )}

        {/* Identity */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
            <Info size={12} /> Identity
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-1">
            <MetaRow label="Name" value={pkg.name} />
            <MetaRow label="Version" value={pkg.version} mono />
            <MetaRow label="SPDX ID" value={pkg.spdxId} mono />
            <MetaRow label="Hash" value={pkg.hash} mono />
            <MetaRow label="Source" value={pkg.sourceInfo} />
          </div>
        </section>

        {/* Provenance */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
            <Package size={12} /> Provenance
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-1">
            <MetaRow label="Supplier" value={pkg.supplier} />
            <MetaRow label="Originator" value={pkg.originator} />
            <MetaRow label="Download" value={pkg.downloadLocation} href={pkg.downloadLocation} />
            <MetaRow label="Homepage" value={pkg.homepage} href={pkg.homepage} />
            <MetaRow label="Copyright" value={pkg.copyrightText} />
          </div>
        </section>

        {/* License */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
            <Shield size={12} /> License
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-1">
            <MetaRow label="Declared" value={cleanLicense(pkg.raw.licenseDeclared)} />
            <MetaRow label="Concluded" value={cleanLicense(pkg.raw.licenseConcluded)} />
          </div>
        </section>

        {/* PURL */}
        {pkg.purl && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
              <Tag size={12} /> Package URL
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <code className="text-xs text-indigo-600 dark:text-indigo-400 break-all flex-1">{pkg.purl}</code>
                <CopyButton value={pkg.purl} />
              </div>
            </div>
          </section>
        )}

        {/* CPEs */}
        {uniqueCpes.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
              <Hash size={12} /> CPEs
              <a href={nvdHref} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5">
                Search NVD <ExternalLink size={10} />
              </a>
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 flex flex-col gap-2">
              {uniqueCpes.map((cpe) => (
                <div key={cpe} className="flex items-start gap-1.5">
                  <code className="text-xs text-gray-600 dark:text-gray-300 break-all flex-1">{cpe}</code>
                  <CopyButton value={cpe} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Layer IDs */}
        {layerIds.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Layer{layerIds.length > 1 ? 's' : ''}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 flex flex-col gap-2">
              {layerIds.map((lid) => (
                <div key={lid} className="flex items-start gap-1.5">
                  <code className="text-xs text-gray-600 dark:text-gray-300 break-all flex-1">{lid}</code>
                  <CopyButton value={lid} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Files */}
        {pkg.files.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
              <FileText size={12} /> Files
              <span className="ml-auto text-[10px] text-gray-400 font-normal normal-case tracking-normal">
                {pkg.files.length} file{pkg.files.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <div className="flex flex-col gap-1.5">
              {pkg.files.map((file) => (
                <div key={file.spdxId}
                  className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText size={12} className="text-gray-400 shrink-0" />
                    <span className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                      {file.fileName}
                    </span>
                  </div>
                  {file.fileTypes && file.fileTypes.length > 0 && (
                    <div className="flex gap-1 mb-1.5 flex-wrap">
                      {file.fileTypes.map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {file.sha256 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 w-10 shrink-0">SHA256</span>
                        <code className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate flex-1">{file.sha256}</code>
                        <CopyButton value={file.sha256} />
                      </div>
                    )}
                    {file.sha1 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 w-10 shrink-0">SHA1</span>
                        <code className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate flex-1">{file.sha1}</code>
                        <CopyButton value={file.sha1} />
                      </div>
                    )}
                    {file.layerId && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 w-10 shrink-0">Layer</span>
                        <code className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate flex-1">{file.layerId.slice(7, 19)}…</code>
                        <CopyButton value={file.layerId} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyzeDetailPage() {
  const router = useRouter();
  const params = useParams<{ image: string; sbom: string }>();

  const imageSlug = decodeURIComponent(params.image ?? '');
  const toolFile = decodeURIComponent(params.sbom ?? '');
  const imageName = formatContainerName(imageSlug);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<SbomInfo | null>(null);
  const [packages, setPackages] = useState<RichPackage[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPkg, setSelectedPkg] = useState<RichPackage | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageSlug || !toolFile) return;
    setLoading(true);
    fetch(`/api/sbom/${imageSlug}/${toolFile}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((doc: SpdxDocument) => {
        const parsed = parseDocument(doc, imageName);
        setInfo(parsed.info);
        setPackages(parsed.packages);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [imageSlug, toolFile]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of packages) counts.set(p.pkgType, (counts.get(p.pkgType) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [packages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return packages.filter(p => {
      const matchType = typeFilter === 'all' || p.pkgType === typeFilter;
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.version.toLowerCase().includes(q)
        || p.purl?.toLowerCase().includes(q) || p.license?.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [packages, search, typeFilter]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPkg(null);
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Parsing SBOM…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-red-500 font-medium">Failed to load SBOM</p>
        <p className="text-xs text-gray-400">{error}</p>
        <button onClick={() => router.push('/analyze')}
          className="text-sm text-indigo-500 hover:underline mt-2">← Back to list</button>
      </div>
    );
  }

  const toolLabel = toolFile.replace('.json', '').replace('.', ' · ').toUpperCase();

  return (
    <>
    <div className="flex flex-col gap-6 pb-12">

      {/* ── Back + title ── */}
      <div>
       <BackButton/> 
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{imageName}</h1>
            <p className="text-sm text-gray-400 mt-0.5 capitalize">{toolLabel}</p>
          </div>
        </div>
      </div>

      {/* ── SBOM info strip ── */}
      {info && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tool', value: `${info.tool}${info.toolVersion ? ` ${info.toolVersion}` : ''}` },
            { label: 'Format', value: `${info.format} ${info.spdxVersion}` },
            { label: 'Created', value: new Date(info.created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) },
            { label: 'Packages', value: info.totalPackages.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</p>
            </div>
          ))}
        </div>
      )}
      {info?.documentNamespace && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 shrink-0">Namespace</span>
          <code className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{info.documentNamespace}</code>
          <CopyButton value={info.documentNamespace} />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search packages, versions, licenses… (⌘K)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
              typeFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-300')}
          >
            All ({packages.length})
          </button>
          {typeOptions.map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize',
                typeFilter === type ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-300')}
            >
              {type} ({count})
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 ml-auto shrink-0 tabular-nums">
          {filtered.length} / {packages.length}
        </p>
      </div>

      {/* ── Package table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Package</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Version</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">License</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Files</th>
                <th className="py-3 px-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                    No packages match your filter.
                  </td>
                </tr>
              ) : filtered.map((pkg) => (
                <tr
                  key={pkg.spdxId}
                  onClick={() => setSelectedPkg(pkg)}
                  className={cn(
                    'border-b border-gray-50 dark:border-gray-700/40 cursor-pointer transition-colors group',
                    selectedPkg?.spdxId === pkg.spdxId
                      ? 'bg-indigo-50 dark:bg-indigo-900/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'
                  )}
                >
                  <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                    {pkg.name}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {pkg.version}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide', getPackageTypeColor(pkg.pkgType))}>
                      {pkg.pkgType}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-500 dark:text-gray-400 max-w-[140px] truncate">
                    {pkg.license ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate">
                    {pkg.supplier ?? pkg.originator ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums">
                    {pkg.files.length > 0
                      ? <span className="text-xs text-gray-500">{pkg.files.length}</span>
                      : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>}
                  </td>
                  <td className="py-2.5 px-2">
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Drawer overlay ── */}
      <AnimatePresence>
        {selectedPkg && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPkg(null)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            />
            <PackageDrawer key="drawer" pkg={selectedPkg} onClose={() => setSelectedPkg(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
    </>
  );
  
}