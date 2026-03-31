'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ChevronRight,
} from 'lucide-react';
import { cn, getPackageTypeColor, TOOL_COLORS } from '@/lib/utils';
import { formatContainerName } from '@/lib/container/containerUtils';
import { BackButton } from '@/components/button/BackButton';
import { Card } from '@/components/card/Card';
import { SbomInfo, RichPackage, AnalyzeSPDX } from '@/lib/sbom/spdx/parser';
import { SpdxDocument } from '@/lib/sbom/spdx/types';
import { CopyButton } from '@/components/button/CopyButton';
import { PackageDrawer } from './components';
import { LoadingSpinner } from '@/components/hoc/LoadingSpinner';
import { PageTitle } from '@/components/Title/Title';
import { ResponsiveContainer, Pie, Tooltip, PieChart } from 'recharts';





// ─── Package drawer ───────────────────────────────────────────────────────────



// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyzeDetailPage() {
  const params = useParams<{ image: string; sbom: string }>();

  const imageSlug = decodeURIComponent(params.image ?? '');
  const toolFile = decodeURIComponent(params.sbom ?? '');
  const imageName = formatContainerName(imageSlug);

  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState('');
  const [info, setInfo] = useState<SbomInfo | null>(null);
  const [packages, setPackages] = useState<RichPackage[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPkg, setSelectedPkg] = useState<RichPackage | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageSlug || !toolFile) return;
    fetch(`/api/sbom/${imageSlug}/${toolFile}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((doc: SpdxDocument) => {
        const parsed = AnalyzeSPDX(doc, imageName);
        setInfo(parsed.info);
        setPackages(parsed.packages);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [imageSlug, toolFile,imageName]);

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

  if (loading) return <LoadingSpinner message="Parsing SBOM…" />

  const toolLabel = toolFile.replace('.json', '').replace('.', ' · ').toUpperCase();

  return (
    <>
      <div className="flex flex-col gap-6 pb-12">

        {/* ── Back + title ── */}
        <div>
          <BackButton />
          <PageTitle title={imageName} subtitle={toolLabel}></PageTitle>
        </div>

        {/* ── SBOM info strip ── */}
        {info && (

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Tool & Version', value: `${info.tool}${info.toolVersion ? ` ${info.toolVersion}` : ''}` },
              { label: 'Format', value: `${info.format} ${info.spdxVersion}` },
              { label: 'Created', value: new Date(info.created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) },
              { label: 'Packages', value: info.totalPackages.toLocaleString() },
            ].map(({ label, value }) => (
              <Card key={label} className="px-4 py-3 dark:bg-gray-800">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  {label}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {value}
                </p>
              </Card>
            ))}

          </div>


        )}

        {info && <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <Card className="px-4 py-3 dark:bg-gray-800">
              <div>License information</div>
              <ResponsiveContainer
                height={200}
                width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={[
                      {
                        fill: '#0088FE',
                        name: 'License declared',
                        value: info.licenseInfo.declared
                      },
                      {
                        fill: '#00C49F',
                        name: 'License deducted',
                        value: info.licenseInfo.deducted
                      },
                      {
                        fill: '#FFBB28',
                        name: 'Unknown License',
                        value: info.licenseInfo.unknown
                      },
                    ]}
                    dataKey="value"
                    fill="#8884d8"
                    innerRadius={60}
                    nameKey="name"
                    outerRadius={80}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>


            <Card className="px-4 py-3 dark:bg-gray-800">
              <div>Package Information</div>
              <ResponsiveContainer
                height={200}
                width="100%">

                <PieChart>
                  <Pie
                    data={Object.entries(info.packageInfo).map((key, v) => {
                      return {
                        fill: TOOL_COLORS[v],
                        name: key[0],
                        value: key[1]
                      }
                    })}
                    dataKey="value"
                    fill="#8884d8"
                    innerRadius={60}
                    nameKey="name"
                    outerRadius={80}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            </div>
            }
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