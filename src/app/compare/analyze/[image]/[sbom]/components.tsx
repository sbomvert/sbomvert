import { CopyButton } from "@/components/button/CopyButton";
import { RichPackage, cleanLicense } from "@/lib/sbom/spdx/parser";
import { cn, getPackageTypeColor } from "@/lib/utils";
import { motion } from "framer-motion";
import { X, Hash,Info, Package, Shield, Tag, ExternalLink, FileText } from "lucide-react";


export function MetaRow({ label, value, mono, href }: { label: string; value?: string | null; mono?: boolean; href?: string }) {
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

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide', className)}>
      {children}
    </span>
  );
}


export function PackageDrawer({ pkg, onClose }: { pkg: RichPackage; onClose: () => void }) {
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