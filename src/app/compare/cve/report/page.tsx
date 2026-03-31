'use client';
import { useEffect, useState, useMemo } from 'react';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { CVEReport, loadCVEsForImage } from '@/lib/vuln/vulnLoader';
import { TOOL_COLORS } from '@/lib/utils';
import { PackageRow, getUniqueCVEs, getVulnerablePackages, buildPackageRows } from '@/lib/vuln/cveSummary';
import { LoadingSpinner } from '@/components/hoc/LoadingSpinner';
import { CVEToolSelector } from '@/components/hoc/CVEToolSelector/CVEToolSelector';
import { CVEStatCard } from '@/components/hoc/CVEStatCard/cveStatCard';
import { HorizontalStrip } from '@/components/horizontalStrip/HorizontalStrip';
import { ViewSwitch } from '@/components/hoc/ViewSwitch';
import { BackButton } from '@/components/button/BackButton';

type ViewMode = 'summary' | 'table';

function cveLink(cveId: string) {
  return `https://nvd.nist.gov/vuln/detail/${cveId}`;
}

function CVEChip({ cveId }: { cveId: string }) {
  return (
    <a
      href={cveLink(cveId)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-caption font-mono text-primary hover:underline"
    >
      {cveId}
    </a>
  );
}

function PackageTableRow({
  row, tools, toolColors, isExpanded, onToggle,
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
        className={`border-b border-border-subtle cursor-pointer transition-colors ${
          isExpanded ? 'bg-info-subtle' : 'hover:bg-surface-alt'
        }`}
      >
        <td className="py-3 px-4 font-mono text-body-sm text-foreground max-w-xs">
          <div className="flex items-center gap-2">
            <svg
              className={`w-3.5 h-3.5 text-foreground-subtle shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
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
              className="text-label font-semibold px-2 py-0.5 rounded-pill border capitalize"
              style={{ color: toolColors[onlyIn], borderColor: toolColors[onlyIn], background: `${toolColors[onlyIn]}18` }}
            >
              only {onlyIn}
            </span>
          ) : (
            <span className="text-label text-foreground-subtle">shared</span>
          )}
        </td>
        {tools.map(tool => {
          const count = row.byCve[tool]?.length ?? 0;
          return (
            <td key={tool} className="py-3 px-4 text-center tabular-nums">
              {count > 0 ? (
                <span
                  className="inline-block text-body-sm font-semibold rounded-pill min-w-[1.75rem] py-0.5 px-2"
                  style={{ background: `${toolColors[tool]}22`, color: toolColors[tool] }}
                >
                  {count}
                </span>
              ) : (
                <span className="text-foreground-subtle text-body-sm">—</span>
              )}
            </td>
          );
        })}
        {tools.length === 2 && (
          <td className="py-3 px-4 text-center">
            {(() => {
              const d = (row.byCve[tools[0]]?.length ?? 0) - (row.byCve[tools[1]]?.length ?? 0);
              if (d === 0) return <span className="text-foreground-subtle text-body-sm">0</span>;
              return (
                <span className={`text-body-sm font-semibold ${d > 0 ? 'text-warning' : 'text-success'}`}>
                  {d > 0 ? `+${d}` : d}
                </span>
              );
            })()}
          </td>
        )}
      </tr>
      {isExpanded && (
        <tr className="bg-info-subtle border-b border-border-subtle">
          <td colSpan={colSpanTotal} className="py-4 px-8">
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${tools.length}, 1fr)` }}>
              {tools.map(tool => {
                const list = row.byCve[tool] ?? [];
                return (
                  <div key={tool}>
                    <p className="text-caption font-semibold uppercase tracking-wider mb-2 capitalize" style={{ color: toolColors[tool] }}>
                      {tool} ({list.length})
                    </p>
                    {list.length === 0 ? (
                      <p className="text-caption text-foreground-subtle italic">Not detected</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {list.map(cve => <CVEChip key={cve} cveId={cve} />)}
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

export default function CVEPage() {
  const router = useRouter();
  const selectedImage = useArtifactStore(s => s.selectedImage);
  const [cves, setCves]                     = useState<CVEReport>({});
  const [viewMode, setViewMode]             = useState<string>('summary');
  const [loading, setLoading]               = useState(true);
  const [allTools, setAllTools]             = useState<string[]>([]);
  const [selectedTools, setSelectedTools]   = useState<Set<string>>(new Set());
  const [search, setSearch]                 = useState('');
  const [expandedRows, setExpandedRows]     = useState<Set<string>>(new Set());
  const [filterExclusive, setFilterExclusive] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) { router.replace('/compare'); return; }
    loadCVEsForImage(selectedImage).then(({ cves: data }) => {
      const tools = Object.keys(data);
      setCves(data);
      setAllTools(tools);
      setSelectedTools(new Set(tools));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedImage, router]);

  const activeTools       = useMemo(() => allTools.filter(t => selectedTools.has(t)), [allTools, selectedTools]);
  const toolColors        = useMemo(() => Object.fromEntries(allTools.map((t, i) => [t, TOOL_COLORS[i % TOOL_COLORS.length]])), [allTools]);
  const globalUniqueCVEs  = useMemo(() => getUniqueCVEs(cves, activeTools), [cves, activeTools]);
  const globalVulnPackages = useMemo(() => getVulnerablePackages(cves, activeTools), [cves, activeTools]);

  const perToolStats = useMemo(() =>
    activeTools.map(tool => ({
      tool,
      totalVulns:          cves[tool]?.totalCVEs ?? 0,
      uniqueVulns:         new Set(cves[tool]?.cves ?? []).size,
      vulnerablePackages:  Object.values(cves[tool]?.vulns_by_package ?? {}).filter(a => a.length > 0).length,
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
    packageRows.filter(row => {
      const matchSearch    = !search || row.pkg.toLowerCase().includes(search.toLowerCase());
      const matchExclusive = !filterExclusive || (row.detectedBy.size === 1 && row.detectedBy.has(filterExclusive));
      return matchSearch && matchExclusive;
    }),
    [packageRows, search, filterExclusive]
  );

  const handleToolToggle = (tool: string) => {
    setSelectedTools(prev => {
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
  const stripMap = {
    'Unique CVEs':          globalUniqueCVEs.size.toString(),
    'Tools compared':       activeTools.length.toString(),
    'Vulnerable packages':  globalVulnPackages.size.toString(),
  };

  const thClass = 'text-left py-3 px-4 text-label font-semibold text-foreground-muted uppercase tracking-wider';

  return (
    <>
      <BackButton />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-label font-semibold uppercase tracking-widest text-primary mb-1">CVE Comparison</p>
          <h1 className="text-heading-lg font-bold text-foreground truncate max-w-xl">{selectedImage}</h1>
        </div>
        <ViewSwitch modes={['summary', 'table']} selected={viewMode} onChange={setViewMode} />
      </div>
      <div className="mb-6" />

      <CVEToolSelector allTools={allTools} selectedTools={selectedTools} toolColors={toolColors} onToggle={handleToolToggle} />
      <div className="mb-6" />

      {!canCompare ? (
        <div className="text-center py-16 text-foreground-muted text-body-sm">
          {allTools.length === 0
            ? 'No CVE reports found for this subject.'
            : allTools.length === 1
            ? `Only 1 scanner found (${allTools[0]}). Upload a second CVE report to compare.`
            : 'Select at least 2 tools to see the comparison.'}
        </div>
      ) : (
        <>
          <HorizontalStrip entries={stripMap} />
          <div className="mb-6" />

          {/* Summary view */}
          {viewMode === 'summary' && (
            <section className="space-y-4">
              <h2 className="text-label font-semibold uppercase tracking-widest text-foreground-muted">Per-tool breakdown</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(activeTools.length, 3)}, 1fr)` }}>
                {perToolStats.map(({ tool, totalVulns, uniqueVulns, vulnerablePackages }) => (
                  <CVEStatCard
                    key={tool} tool={tool} color={toolColors[tool]}
                    totalVulns={totalVulns} uniqueVulns={uniqueVulns}
                    vulnerablePackages={vulnerablePackages} globalUnique={globalUniqueCVEs.size}
                  />
                ))}
              </div>

              <div className="bg-surface rounded-card-lg shadow-panel border border-border-subtle p-card-p">
                <h3 className="text-body-sm font-semibold text-foreground-muted mb-4">
                  Exclusive vulnerable packages
                  <span className="ml-2 text-caption font-normal text-foreground-subtle">packages seen by only one tool</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {activeTools.map(tool => (
                    <div key={tool} className="flex items-center gap-2 px-4 py-2 rounded-card" style={{ background: `${toolColors[tool]}15` }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: toolColors[tool] }} />
                      <span className="text-body-sm font-medium text-foreground capitalize">{tool}</span>
                      <span className="text-body font-bold tabular-nums" style={{ color: toolColors[tool] }}>{exclusiveCounts[tool] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Table view */}
          {viewMode === 'table' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search packages…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-body-sm bg-surface border border-border rounded-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-foreground-subtle"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterExclusive(null)}
                    className={`text-caption px-3 py-1.5 rounded-pill border transition-colors font-medium ${
                      !filterExclusive ? 'bg-primary text-white border-primary' : 'border-border text-foreground-muted hover:border-primary'
                    }`}
                  >
                    All
                  </button>
                  {activeTools.map(tool => (
                    <button
                      key={tool}
                      onClick={() => setFilterExclusive(filterExclusive === tool ? null : tool)}
                      className="text-caption px-3 py-1.5 rounded-pill border transition-colors font-medium capitalize"
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
                <p className="text-caption text-foreground-muted ml-auto shrink-0">
                  {filteredRows.length} / {packageRows.length} packages
                </p>
              </div>

              <div className="bg-surface rounded-card-lg shadow-panel border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="bg-surface-alt border-b border-border">
                        <th className={thClass}>Package</th>
                        <th className={thClass}>Status</th>
                        {activeTools.map(tool => (
                          <th key={tool} className="text-center py-3 px-4 text-label font-semibold uppercase tracking-wider capitalize" style={{ color: toolColors[tool] }}>
                            {tool}
                          </th>
                        ))}
                        {activeTools.length === 2 && <th className={`${thClass} text-center`}>Δ</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={2 + activeTools.length + (activeTools.length === 2 ? 1 : 0)} className="py-12 text-center text-foreground-muted text-body-sm">
                            No packages match your filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map(row => (
                          <PackageTableRow
                            key={row.pkg} row={row} tools={activeTools} toolColors={toolColors}
                            isExpanded={expandedRows.has(row.pkg)}
                            onToggle={() => setExpandedRows(prev => {
                              const next = new Set(prev);
                              next.has(row.pkg) ? next.delete(row.pkg) : next.add(row.pkg);
                              return next;
                            })}
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
    </>
  );
}
