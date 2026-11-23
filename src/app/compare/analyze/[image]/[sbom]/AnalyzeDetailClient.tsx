'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { TOOL_COLORS } from '@/lib/utils';
import { PackageTypeBadge } from '@/components/hoc/PackageTypeBadge';
import { BackButton } from '@/components/button/BackButton';
import { Card } from '@/components/card/Card';
import { SbomInfo, RichPackage } from '@/lib/sbom/analyzeTypes';
import { CopyButton } from '@/components/button/CopyButton';
import { SearchBar } from '@/components/searchbar/SearchBar';
import { FilterPill } from '@/components/pill/FilterPill';
import { PackageDrawer } from '@/components/hoc/PackageDrawer/PackageDrawer';
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
            <Card key={label} className="px-4 py-3 bg-surface-alt">
              <p className="text-micro font-semibold uppercase tracking-widest text-foreground-subtle mb-1">
                {label}
              </p>
              <p className="text-body-sm font-semibold text-foreground truncate">
                {value}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      {info && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="px-4 py-3 bg-surface-alt">
            <div>License information</div>
            <ResponsiveContainer height={200} width="100%">
              <PieChart>
                <Pie
                  // categorical chart colors, the same in both themes
                  /* eslint-disable sbomvert/design-tokens */
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
                  /* eslint-enable sbomvert/design-tokens */
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={80}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="px-4 py-3 bg-surface-alt">
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
        <div className="bg-surface rounded-xl border px-4 py-3 flex items-center gap-2">
          <span className="text-micro font-semibold uppercase text-foreground-subtle">
            Namespace
          </span>
          <code className="text-caption text-foreground-muted truncate flex-1">
            {info.documentNamespace}
          </code>
          <CopyButton value={info.documentNamespace} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchBar
          ref={searchRef}
          value={search}
          onChange={setSearch}
          placeholder="Search packages… (⌘K)"
          className="mb-0 flex-1 max-w-sm w-full"
          iconClassName="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
          size={14}
        />

        <div className="flex gap-1.5 flex-wrap">
          <FilterPill active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
            All ({packages.length})
          </FilterPill>

          {typeOptions.map(([type, count]) => (
            <FilterPill key={type} active={typeFilter === type} onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
              {type} ({count})
            </FilterPill>
          ))}
        </div>

        <p className="text-caption text-foreground-subtle ml-auto">
          {filtered.length} / {packages.length}
        </p>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <tbody>
              {filtered.map((pkg) => (
                <tr
                  key={pkg.sourceRef}
                  onClick={() => setSelectedPkg(pkg)}
                  className="cursor-pointer border-b border-border hover:bg-surface-alt"
                >
                  <td className="px-4 py-2 max-w-xs">
                    <div className="font-medium truncate" title={pkg.name}>{pkg.name}</div>
                  </td>
                  <td className="px-4 py-2 text-caption font-mono max-w-[12rem] truncate" title={pkg.version}>{pkg.version}</td>
                  <td className="px-4 py-2">
                    <PackageTypeBadge type={pkg.pkgType} />
                  </td>
                  <td className="px-4 py-2 text-caption">
                    {pkg.license ?? 'Not reported'}
                  </td>
                  <td className="px-4 py-2 text-caption">
                    {pkg.supplier ?? pkg.originator ?? 'Not reported'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {pkg.files.length}
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
              className="fixed inset-0 bg-overlay z-40"
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
