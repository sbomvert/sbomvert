export interface ToolSummaryRow {
  tool: string;
  color: string;
  total: number;
  unique: number;
  packages: number;
  repeated: number;
}

export function CVEToolSummaryTable({ rows, totalCVEs }: { rows: ToolSummaryRow[]; totalCVEs: number }) {
  return (
    <div className="bg-surface rounded-card-lg shadow-card border border-border-subtle overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-border-subtle text-label font-medium text-foreground-subtle">
            <th scope="col" className="py-3 px-4 text-left font-medium">Tool</th>
            <th scope="col" className="py-3 px-4 text-right font-medium">Total</th>
            <th scope="col" className="py-3 px-4 text-right font-semibold text-foreground">Unique CVEs</th>
            <th scope="col" className="py-3 px-4 text-right font-medium">Packages</th>
            <th scope="col" className="py-3 px-4 text-right font-medium">On several packages</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.tool} className="border-b border-border-subtle last:border-0">
              <th scope="row" className="py-3 px-4 text-left font-medium text-foreground capitalize">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                  {row.tool}
                </span>
              </th>
              <td className="py-3 px-4 text-right tabular-nums text-foreground-muted">{row.total.toLocaleString()}</td>
              <td className="py-3 px-4 text-right tabular-nums font-semibold text-foreground">{row.unique.toLocaleString()}</td>
              <td className="py-3 px-4 text-right tabular-nums text-foreground-muted">{row.packages.toLocaleString()}</td>
              <td className="py-3 px-4 text-right tabular-nums text-foreground-muted">{row.repeated.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 border-t border-border-subtle text-caption text-foreground-subtle">
        Total: each CVE once per package it affects. Unique CVEs: distinct CVEs the tool reports, out of {totalCVEs.toLocaleString()} in all.
        On several packages: CVEs the tool reports on more than one package.
      </p>
    </div>
  );
}
