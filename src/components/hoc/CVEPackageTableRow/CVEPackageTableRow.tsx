import type { PackageFix, VulnDetail } from '@sbomvert/core/vuln/vulnDetail';
import { PackageRow, cvesDiffer, fixText, packageFixText } from '@/lib/vuln/cveSummary';
import { PackageTypeBadge } from '@/components/hoc/PackageTypeBadge';

// the CVE id, as a button that opens its details, with the severity, score and fix the report has for it.
// The fix is this package's own when the report has it, otherwise the CVE's.
function CVEChip({
  cveId, detail, fix, onSelect,
}: { cveId: string; detail?: VulnDetail; fix?: PackageFix; onSelect: () => void }) {
  // the package's own match gives its severity and score; the CVE's detail is the first match's, which another package can
  // share, so it only stands in for a report with no match for this package
  const source = fix ?? detail;
  const severity = source?.severity?.toUpperCase();
  const score = source?.score;
  const details = [
    severity,
    score === undefined ? undefined : score.toFixed(1),
    packageFixText(fix) ?? fixText(detail),
  ].filter(Boolean).join(' · ');
  return (
    <div className="flex items-baseline gap-2">
      <button
        type="button"
        onClick={onSelect}
        className="text-caption font-mono text-primary-fg hover:underline text-left"
      >
        {cveId}
      </button>
      {details && <span className="text-caption text-foreground-muted tabular-nums">{details}</span>}
    </div>
  );
}

export function PackageTableRow({
  row, tools, toolColors, cveDetails, packageFixes = {}, onSelectCve, isExpanded, onToggle,
}: {
  row: PackageRow;
  tools: string[];
  toolColors: Record<string, string>;
  // per tool, per CVE id: what the scanner said about it
  cveDetails: Record<string, Record<string, VulnDetail>>;
  // per tool, per package, per CVE id: the fix on this package
  packageFixes?: Record<string, Record<string, Record<string, PackageFix>>>;
  // called with the CVE id when its button is clicked
  onSelectCve: (cveId: string, pkg: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const onlyIn = row.detectedBy.size === 1 ? Array.from(row.detectedBy)[0] : null;
  const differs = !onlyIn && cvesDiffer(row);
  const colSpanTotal = 3 + tools.length + (tools.length === 2 ? 1 : 0);

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
          <PackageTypeBadge type={row.packageType} />
        </td>
        <td className="py-3 px-4 w-px whitespace-nowrap">
          {onlyIn ? (
            <span
              className="text-label font-semibold px-2 py-0.5 rounded-pill border capitalize"
              style={{ color: toolColors[onlyIn], borderColor: toolColors[onlyIn], background: `${toolColors[onlyIn]}18` }}
            >
              only {onlyIn}
            </span>
          ) : differs ? (
            <span
              title="The tools that report this package list different CVEs for it"
              className="text-label font-semibold px-2 py-0.5 rounded-pill bg-warning-subtle text-warning-fg"
            >
              differs
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
                <span className="font-mono tabular-nums text-body-sm font-semibold text-foreground">{count}</span>
              ) : (
                <span className="text-foreground-subtle text-body-sm">0</span>
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
                <span className={`text-body-sm font-semibold ${d > 0 ? 'text-warning-fg' : 'text-success-fg'}`}>
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
                // CVE ids as plain strings, so the order is lexical (CVE-2024-10 comes before CVE-2024-9)
                // unique ids: React needs a unique key per chip
                const list = [...new Set(row.byCve[tool] ?? [])].sort();
                return (
                  <div key={tool}>
                    <p className="text-body-sm font-semibold mb-2 text-foreground capitalize">
                      <span aria-hidden className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: toolColors[tool] }} />
                      {tool} ({list.length})
                    </p>
                    {list.length === 0 ? (
                      <p className="text-caption text-foreground-subtle">Not detected</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {list.map(cve => (
                          <CVEChip
                            key={cve}
                            cveId={cve}
                            detail={cveDetails[tool]?.[cve]}
                            fix={packageFixes[tool]?.[row.pkg]?.[cve]}
                            onSelect={() => onSelectCve(cve, row.pkg)}
                          />
                        ))}
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
