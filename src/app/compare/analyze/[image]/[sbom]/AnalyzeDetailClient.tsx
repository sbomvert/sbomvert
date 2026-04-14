'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight } from 'lucide-react';
import { cn, getPackageTypeColor, TOOL_COLORS } from '@/lib/utils';
import { BackButton } from '@/components/button/BackButton';
import { Card } from '@/components/card/Card';
import { SbomInfo, RichPackage } from '@/lib/sbom/spdx/parser';
import { CopyButton } from '@/components/button/CopyButton';
import { PackageDrawer } from './components';
import { PageTitle } from '@/components/Title/Title';
import {
  ResponsiveContainer,
  Pie,
  Tooltip,
  PieChart,
} from 'recharts';

export default function AnalyzeDetailClient({
  imageName,
  toolFile,
  info,
  packages,
}: {
  imageName: string;
  toolFile: string;
  info: SbomInfo | null;
  packages: RichPackage[];
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPkg, setSelectedPkg] = useState<RichPackage | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const toolLabel = toolFile
    .replace('.json', '')
    .replace('.', ' · ')
    .toUpperCase();

  // ── Derived ───────────────────────────────────────────────
  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of packages) {
      counts.set(p.pkgType, (counts.get(p.pkgType) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [packages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return packages.filter((p) => {
      const matchType =
        typeFilter === 'all' || p.pkgType === typeFilter;

      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.version.toLowerCase().includes(q) ||
        p.purl?.toLowerCase().includes(q) ||
        p.license?.toLowerCase().includes(q);

      return matchType && matchSearch;
    });
  }, [packages, search, typeFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPkg(null);
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div>
        <BackButton />
        <PageTitle title={imageName} subtitle={toolLabel} />
      </div>

      {/* SBOM Info */}
      {info && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Tool & Version',
              value: `${info.tool}${
                info.toolVersion ? ` ${info.toolVersion}` : ''
              }`,
            },
            {
              label: 'Format',
              value: `${info.format} ${info.spdxVersion}`,
            },
            {
              label: 'Created',
              value: new Date(info.created).toLocaleString(
                undefined,
                {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }
              ),
            },
            {
              label: 'Packages',
              value: info.totalPackages.toLocaleString(),
            },
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

      {/* Charts */}
      {info && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="px-4 py-3 dark:bg-gray-800">
            <div>License information</div>
            <ResponsiveContainer height={200} width="100%">
              <PieChart>
                <Pie
                  data={[
                    {
                      fill: '#0088FE',
                      name: 'License declared',
                      value: info.licenseInfo.declared,
                    },
                    {
                      fill: '#00C49F',
                      name: 'License detected',
                      value: info.licenseInfo.deducted,
                    },
                    {
                      fill: '#FFBB28',
                      name: 'Unknown License',
                      value: info.licenseInfo.unknown,
                    },
                  ]}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={80}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="px-4 py-3 dark:bg-gray-800">
            <div>Package Information</div>
            <ResponsiveContainer height={200} width="100%">
              <PieChart>
                <Pie
                  data={Object.entries(info.packageInfo).map(
                    ([name, value], i) => ({
                      name,
                      value,
                      fill: TOOL_COLORS[i],
                    })
                  )}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={80}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Namespace */}
      {info?.documentNamespace && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border px-4 py-3 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase text-gray-400">
            Namespace
          </span>
          <code className="text-xs text-gray-500 truncate flex-1">
            {info.documentNamespace}
          </code>
          <CopyButton value={info.documentNamespace} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages… (⌘K)"
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border',
              typeFilter === 'all' && 'bg-indigo-600 text-white'
            )}
          >
            All ({packages.length})
          </button>

          {typeOptions.map(([type, count]) => (
            <button
              key={type}
              onClick={() =>
                setTypeFilter(typeFilter === type ? 'all' : type)
              }
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border capitalize',
                typeFilter === type && 'bg-indigo-600 text-white'
              )}
            >
              {type} ({count})
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 ml-auto">
          {filtered.length} / {packages.length}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {filtered.map((pkg) => (
                <tr
                  key={pkg.spdxId}
                  onClick={() => setSelectedPkg(pkg)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-2">{pkg.name}</td>
                  <td className="px-4 py-2 text-xs">{pkg.version}</td>
                  <td className="px-4 py-2">
                    <span className={getPackageTypeColor(pkg.pkgType)}>
                      {pkg.pkgType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {pkg.license ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {pkg.supplier ?? pkg.originator ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {pkg.files.length || '—'}
                  </td>
                  <td className="px-2">
                    <ChevronRight size={13} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedPkg && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setSelectedPkg(null)}
            />
            <PackageDrawer
              pkg={selectedPkg}
              onClose={() => setSelectedPkg(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}