export function CVEStatCard({
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
      className="bg-surface rounded-card-lg shadow-card overflow-hidden border border-border-subtle"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <h3 className="font-semibold text-foreground tracking-tight capitalize">{tool}</h3>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',      value: totalVulns },
            { label: 'Unique CVEs', value: uniqueVulns },
            { label: 'Vuln Pkgs',  value: vulnerablePackages },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <dt className="text-label font-medium text-foreground-subtle uppercase tracking-wider mb-1">{label}</dt>
              <dd className="text-display font-bold text-foreground tabular-nums">{value.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="px-6 pb-5">
        <div className="flex justify-between text-caption text-foreground-subtle mb-1">
          <span>Coverage vs unique total</span>
          <span>{coverage}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${coverage}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}
