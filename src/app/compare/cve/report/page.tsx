'use client';
import { useEffect, useState, useMemo } from 'react';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { CVEReport, loadCVEsForImage } from '@/lib/vuln/vulnLoader';
import { TOOL_COLORS } from '@/lib/utils';
import { getUniqueCVEs, getVulnerablePackages, buildPackageRows } from '@/lib/vuln/cveSummary';
import { LoadingSpinner } from '@/components/spinner/LoadingSpinner';
import { CVEToolSelector } from '@/components/hoc/CVEToolSelector/CVEToolSelector';
import { CVEStatCard } from '@/components/hoc/CVEStatCard/cveStatCard';
import { HorizontalStrip } from '@/components/horizontalStrip/HorizontalStrip';
import { ViewSwitch } from '@/components/viewSwitch/ViewSwitch';
import { BackButton } from '@/components/button/BackButton';
import { PackageTableRow } from '@/components/hoc/CVEPackageTableRow/CVEPackageTableRow';
import { PageTitle } from '@/components/Title/Title';
import { Card } from '@/components/card/Card';
import { SearchBar } from '@/components/searchbar/SearchBar';
import { FilterPill } from '@/components/pill/FilterPill';


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
      <PageTitle eyebrow="CVE Comparison" title={selectedImage ?? ''}>
        <ViewSwitch modes={['summary', 'table']} selected={viewMode} onChange={setViewMode} />
      </PageTitle>

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

              <Card className="shadow-panel border border-border-subtle p-card-p">
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
              </Card>
            </section>
          )}

          {/* Table view */}
          {viewMode === 'table' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search packages…"
                  className="mb-0 flex-1 max-w-sm w-full"
                  iconClassName="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                  size={16}
                />
                <div className="flex gap-2 flex-wrap">
                  <FilterPill active={!filterExclusive} onClick={() => setFilterExclusive(null)}>All</FilterPill>
                  {activeTools.map(tool => (
                    <FilterPill
                      key={tool}
                      active={filterExclusive === tool}
                      color={toolColors[tool]}
                      onClick={() => setFilterExclusive(filterExclusive === tool ? null : tool)}
                    >
                      only {tool}
                    </FilterPill>
                  ))}
                </div>
                <p className="text-caption text-foreground-muted ml-auto shrink-0">
                  {filteredRows.length} / {packageRows.length} packages
                </p>
              </div>

              <Card className="shadow-panel border border-border-subtle overflow-hidden p-0">
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
              </Card>
            </section>
          )}
        </>
      )}
    </>
  );
}
