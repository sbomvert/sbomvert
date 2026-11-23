import { PackageRow } from '@/lib/vuln/cveSummary';

function cveLink(cveId: string) {
  return `https://nvd.nist.gov/vuln/detail/${cveId}`;
}

function CVEChip({ cveId }: { cveId: string }) {
  return (
    <a
      href={cveLink(cveId)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-caption font-mono text-primary-fg hover:underline"
    >
      {cveId}
    </a>
  );
}

export function PackageTableRow({
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
                  className="inline-block text-body-sm font-semibold rounded-pill min-w-7 py-0.5 px-2"
                  style={{ background: `${toolColors[tool]}22`, boxShadow: `inset 0 0 0 1px ${toolColors[tool]}`, color: 'var(--foreground)' }}
                >
                  {count}
                </span>
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
                const list = row.byCve[tool] ?? [];
                return (
                  <div key={tool}>
                    <p className="text-body-sm font-semibold mb-2 text-foreground">
                      <span aria-hidden className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: toolColors[tool] }} />
                      {tool} ({list.length})
                    </p>
                    {list.length === 0 ? (
                      <p className="text-caption text-foreground-subtle">Not detected</p>
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
