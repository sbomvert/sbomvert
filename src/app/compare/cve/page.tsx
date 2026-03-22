'use client';
import { useEffect, useState, useMemo } from 'react';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { CVEReport, loadCVEsForImage } from '@/lib/vuln/vulnLoader';
import { TOOL_COLORS } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'summary' | 'table';

interface PackageRow {
  pkg: string;
  byCve: Record<string, string[]>;
  detectedBy: Set<string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUniqueCVEs(cves: CVEReport, tools: string[]): Set<string> {
  const ids = new Set<string>();
  for (const tool of tools) {
    for (const id of cves[tool]?.cves ?? []) ids.add(id);
  }
  return ids;
}

function getVulnerablePackages(cves: CVEReport, tools: string[]): Set<string> {
  const pkgs = new Set<string>();
  for (const tool of tools) {
    for (const [pkg, list] of Object.entries(cves[tool]?.vulns_by_package ?? {})) {
      if (list.length > 0) pkgs.add(pkg);
    }
  }
  return pkgs;
}

function buildPackageRows(cves: CVEReport, tools: string[]): PackageRow[] {
  const pkgSet = new Set<string>();
  for (const tool of tools) {
    for (const pkg of Object.keys(cves[tool]?.vulns_by_package ?? {})) pkgSet.add(pkg);
  }
  return Array.from(pkgSet)
    .map((pkg) => {
      const byCve: Record<string, string[]> = {};
      const detectedBy = new Set<string>();
      for (const tool of tools) {
        const list = cves[tool]?.vulns_by_package?.[pkg] ?? [];
        byCve[tool] = list;
        if (list.length > 0) detectedBy.add(tool);
      }
      return { pkg, byCve, detectedBy };
    })
    .sort((a, b) => b.detectedBy.size - a.detectedBy.size || a.pkg.localeCompare(b.pkg));
}

function cveLink(cveId: string) {
  return `https://nvd.nist.gov/vuln/detail/${cveId}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

function ToolSelector({
  allTools,
  selectedTools,
  toolColors,
  onToggle,
}: {
  allTools: string[];
  selectedTools: Set<string>;
  toolColors: Record<string, string>;
  onToggle: (tool: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Tools being compared
        </h2>
        <span className="text-xs text-gray-400">
          {selectedTools.size} / {allTools.length} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {allTools.map((tool) => {
          const active = selectedTools.has(tool);
          const color = toolColors[tool];
          return (
            <button
              key={tool}
              onClick={() => onToggle(tool)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize
                ${active ? 'shadow-sm' : 'opacity-40 hover:opacity-70'}`}
              style={
                active
                  ? { borderColor: color, background: `${color}18`, color }
                  : { borderColor: '#d1d5db', color: '#9ca3af' }
              }
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: active ? color : '#d1d5db' }}
              />
              {tool}
              {active && (
                <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {selectedTools.size < 2 && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Select at least 2 tools to compare.
        </p>
      )}
    </div>
  );
}

function StatCard({
  tool,
  color,
  totalVulns,
  uniqueVulns,
  vulnerablePackages,
  globalUnique,
}: {
  tool: string;
  color: string;
  totalVulns: number;
  uniqueVulns: number;
  vulnerablePackages: number;
  globalUnique: number;
}) {
  const coverage = globalUnique > 0 ? Math.round((uniqueVulns / globalUnique) * 100) : 0;
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <h3 className="font-semibold text-gray-900 dark:text-white tracking-tight capitalize">
            {tool}
          </h3>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: totalVulns },
            { label: 'Unique CVEs', value: uniqueVulns },
            { label: 'Vuln Pkgs', value: vulnerablePackages },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                {label}
              </dt>
              <dd className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="px-6 pb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Coverage vs unique total</span>
          <span>{coverage}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${coverage}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

function CVEChip({ cveId }: { cveId: string }) {
  return (
    <a
      href={cveLink(cveId)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
    >
      {cveId}
    </a>
  );
}

function PackageTableRow({
  row,
  tools,
  toolColors,
  isExpanded,
  onToggle,
}: {
  row: PackageRow;
  tools: string[];
  toolColors: Record<string, string>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const onlyIn = row.detectedBy.size === 1 ? Array.from(row.detectedBy)[0] : null;
  const colSpanTotal = 2 + tools.length + (tools.length === 2 ? 1 : 0);

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors
          ${isExpanded
            ? 'bg-indigo-50 dark:bg-indigo-900/10'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
      >
        <td className="py-3 px-4 font-mono text-sm text-gray-800 dark:text-gray-200 max-w-xs">
          <div className="flex items-center gap-2">
            <svg
              className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{row.pkg}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          {onlyIn ? (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize"
              style={{ color: toolColors[onlyIn], borderColor: toolColors[onlyIn], background: `${toolColors[onlyIn]}18` }}
            >
              only {onlyIn}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">shared</span>
          )}
        </td>
        {tools.map((tool) => {
          const count = row.byCve[tool]?.length ?? 0;
          return (
            <td key={tool} className="py-3 px-4 text-center tabular-nums">
              {count > 0 ? (
                <span
                  className="inline-block text-sm font-semibold rounded-full min-w-[1.75rem] py-0.5 px-2"
                  style={{ background: `${toolColors[tool]}22`, color: toolColors[tool] }}
                >
                  {count}
                </span>
              ) : (
                <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
              )}
            </td>
          );
        })}
        {tools.length === 2 && (
          <td className="py-3 px-4 text-center">
            {(() => {
              const d = (row.byCve[tools[0]]?.length ?? 0) - (row.byCve[tools[1]]?.length ?? 0);
              if (d === 0) return <span className="text-gray-300 dark:text-gray-600 text-sm">0</span>;
              return (
                <span className={`text-sm font-semibold ${d > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                  {d > 0 ? `+${d}` : d}
                </span>
              );
            })()}
          </td>
        )}
      </tr>
      {isExpanded && (
        <tr className="bg-indigo-50/50 dark:bg-indigo-900/5 border-b border-gray-100 dark:border-gray-700/50">
          <td colSpan={colSpanTotal} className="py-4 px-8">
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: `repeat(${tools.length}, 1fr)` }}
            >
              {tools.map((tool) => {
                const list = row.byCve[tool] ?? [];
                return (
                  <div key={tool}>
                    <p
                      className="text-xs font-semibold uppercase tracking-wider mb-2 capitalize"
                      style={{ color: toolColors[tool] }}
                    >
                      {tool} ({list.length})
                    </p>
                    {list.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Not detected</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {list.map((cve) => <CVEChip key={cve} cveId={cve} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CVEPage() {
  const router = useRouter();
  const selectedImage = useArtifactStore((s) => s.selectedImage);
  const [cves, setCves] = useState<CVEReport>({});
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [loading, setLoading] = useState(true);
  const [allTools, setAllTools] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterExclusive, setFilterExclusive] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) { router.replace('/compare'); return; }
    setLoading(true);
    loadCVEsForImage(selectedImage).then(({ cves: data }) => {
      const tools = Object.keys(data);
      setCves(data);
      setAllTools(tools);
      setSelectedTools(new Set(tools));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedImage, router]);

  const activeTools = useMemo(
    () => allTools.filter((t) => selectedTools.has(t)),
    [allTools, selectedTools]
  );

  const toolColors = useMemo(
    () => Object.fromEntries(allTools.map((t, i) => [t, TOOL_COLORS[i % TOOL_COLORS.length]])),
    [allTools]
  );

  const globalUniqueCVEs = useMemo(() => getUniqueCVEs(cves, activeTools), [cves, activeTools]);
  const globalVulnPackages = useMemo(() => getVulnerablePackages(cves, activeTools), [cves, activeTools]);

  const perToolStats = useMemo(() =>
    activeTools.map((tool) => ({
      tool,
      totalVulns: cves[tool]?.totalCVEs ?? 0,
      uniqueVulns: new Set(cves[tool]?.cves ?? []).size,
      vulnerablePackages: Object.values(cves[tool]?.vulns_by_package ?? {}).filter((a) => a.length > 0).length,
    })),
    [cves, activeTools]
  );

  const packageRows = useMemo(() => buildPackageRows(cves, activeTools), [cves, activeTools]);

  const exclusiveCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of packageRows) {
      if (row.detectedBy.size === 1) {
        const t = Array.from(row.detectedBy)[0];
        counts[t] = (counts[t] ?? 0) + 1;
      }
    }
    return counts;
  }, [packageRows]);

  const filteredRows = useMemo(() =>
    packageRows.filter((row) => {
      const matchSearch = !search || row.pkg.toLowerCase().includes(search.toLowerCase());
      const matchExclusive = !filterExclusive || (
        row.detectedBy.size === 1 && row.detectedBy.has(filterExclusive)
      );
      return matchSearch && matchExclusive;
    }),
    [packageRows, search, filterExclusive]
  );

  const handleToolToggle = (tool: string) => {
    setSelectedTools((prev) => {
      if (prev.size <= 2 && prev.has(tool)) return prev;
      const next = new Set(prev);
      next.has(tool) ? next.delete(tool) : next.add(tool);
      return next;
    });
    setFilterExclusive(null);
    setExpandedRows(new Set());
  };

  if (loading) return <LoadingSpinner message="Loading CVE data…" />;

  const canCompare = selectedTools.size >= 2;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1">
            CVE Comparison
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate max-w-xl">
            {selectedImage}
          </h1>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 self-start sm:self-auto">
          {(['summary', 'table'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
                ${viewMode === mode
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tool selector ── */}
      <ToolSelector
        allTools={allTools}
        selectedTools={selectedTools}
        toolColors={toolColors}
        onToggle={handleToolToggle}
      />

      {!canCompare ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {allTools.length === 0
            ? 'No CVE reports found for this subject.'
            : allTools.length === 1
            ? `Only 1 scanner found (${allTools[0]}). Upload a second CVE report to compare.`
            : 'Select at least 2 tools to see the comparison.'}
        </div>
      ) : (
        <>
          {/* ── Global strip ── */}
          <div className="grid grid-cols-3 gap-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Unique CVEs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {globalUniqueCVEs.size}
              </p>
            </div>
            <div className="text-center border-x border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tools compared</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {activeTools.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Vulnerable packages</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {globalVulnPackages.size}
              </p>
            </div>
          </div>

          {/* ── Summary view ── */}
          {viewMode === 'summary' && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                Per-tool breakdown
              </h2>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(activeTools.length, 3)}, 1fr)` }}
              >
                {perToolStats.map(({ tool, totalVulns, uniqueVulns, vulnerablePackages }) => (
                  <StatCard
                    key={tool}
                    tool={tool}
                    color={toolColors[tool]}
                    totalVulns={totalVulns}
                    uniqueVulns={uniqueVulns}
                    vulnerablePackages={vulnerablePackages}
                    globalUnique={globalUniqueCVEs.size}
                  />
                ))}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  Exclusive vulnerable packages
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    packages seen by only one tool
                  </span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {activeTools.map((tool) => (
                    <div
                      key={tool}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{ background: `${toolColors[tool]}15` }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: toolColors[tool] }} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">
                        {tool}
                      </span>
                      <span className="text-lg font-bold tabular-nums" style={{ color: toolColors[tool] }}>
                        {exclusiveCounts[tool] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Table view ── */}
          {viewMode === 'table' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search packages…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterExclusive(null)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium
                      ${!filterExclusive
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-400'}`}
                  >
                    All
                  </button>
                  {activeTools.map((tool) => (
                    <button
                      key={tool}
                      onClick={() => setFilterExclusive(filterExclusive === tool ? null : tool)}
                      className="text-xs px-3 py-1.5 rounded-full border transition-colors font-medium capitalize"
                      style={
                        filterExclusive === tool
                          ? { background: toolColors[tool], borderColor: toolColors[tool], color: '#fff' }
                          : { borderColor: toolColors[tool], color: toolColors[tool] }
                      }
                    >
                      only {tool}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 ml-auto shrink-0">
                  {filteredRows.length} / {packageRows.length} packages
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Package
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        {activeTools.map((tool) => (
                          <th
                            key={tool}
                            className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider capitalize"
                            style={{ color: toolColors[tool] }}
                          >
                            {tool}
                          </th>
                        ))}
                        {activeTools.length === 2 && (
                          <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Δ
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2 + activeTools.length + (activeTools.length === 2 ? 1 : 0)}
                            className="py-12 text-center text-gray-400 text-sm"
                          >
                            No packages match your filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => (
                          <PackageTableRow
                            key={row.pkg}
                            row={row}
                            tools={activeTools}
                            toolColors={toolColors}
                            isExpanded={expandedRows.has(row.pkg)}
                            onToggle={() =>
                              setExpandedRows((prev) => {
                                const next = new Set(prev);
                                next.has(row.pkg) ? next.delete(row.pkg) : next.add(row.pkg);
                                return next;
                              })
                            }
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}