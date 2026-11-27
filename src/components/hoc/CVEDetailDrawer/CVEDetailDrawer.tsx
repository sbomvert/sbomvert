'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { PackageFix, VulnDetail } from '@sbomvert/core/vuln/vulnDetail';
import { packageFixText } from '@/lib/vuln/cveSummary';

const NOT_REPORTED = 'not reported';
// a missing value in a table cell; the table says once what it means
const MISSING = '—';
const nvdLink = (id: string) => `https://nvd.nist.gov/vuln/detail/${id}`;

// One vulnerability on the package it was opened from, across the tools: each tool's severity, score, fix, source, CVSS
// and advisory for that package. The description and other ids describe the vulnerability itself.
export function CVEDetailDrawer({
  cveId, pkg, tools, toolColors, detailsByTool, packageFixesByTool, onClose,
}: {
  cveId: string;
  // the package the CVE was opened from
  pkg: string;
  tools: string[];
  toolColors: Record<string, string>;
  // per tool, per vulnerability id
  detailsByTool: Record<string, Record<string, VulnDetail>>;
  // per tool, per package, per vulnerability id: the match on that package
  packageFixesByTool: Record<string, Record<string, Record<string, PackageFix>>>;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // each tool's match on this package; undefined when the tool did not report the CVE on it
  const byTool = tools.map(tool => ({ tool, fix: packageFixesByTool[tool]?.[pkg]?.[cveId] }));
  const details = tools.map(tool => ({ tool, detail: detailsByTool[tool]?.[cveId] }));
  const description = details.find(({ detail }) => detail?.description);
  // the other ids of this vulnerability, from every tool, without repeats
  const otherIds = [...new Set(details.flatMap(({ detail }) => detail?.aliases ?? []))];

  return (
    <>
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="fixed inset-0 bg-overlay z-40"
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        aria-labelledby="cve-detail-title"
        className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-surface shadow-panel border-l border-border z-50 flex flex-col"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 id="cve-detail-title" className="font-mono text-heading-sm text-foreground">{cveId}</h2>
            <p className="font-mono text-caption text-foreground-muted break-all">{pkg}</p>
            {cveId.startsWith('CVE-') && (
              <a
                href={nvdLink(cveId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption text-primary-fg hover:underline"
              >
                Open in NVD
              </a>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 p-2 rounded-input text-foreground-muted hover:bg-surface-alt"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <section>
            <h3 className="text-body-sm font-semibold text-foreground mb-2">Description</h3>
            {description ? (
              <>
                <p className="text-body-sm text-foreground">{description.detail?.description}</p>
                <p className="text-caption text-foreground-subtle mt-1 capitalize">from {description.tool}</p>
              </>
            ) : (
              <p className="text-caption text-foreground-subtle">{NOT_REPORTED}</p>
            )}
          </section>

          <section>
            <h3 className="text-body-sm font-semibold text-foreground mb-3">Other IDs</h3>
            {otherIds.length === 0 ? (
              <p className="text-caption text-foreground-subtle">{NOT_REPORTED}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {otherIds.map(id => (
                  <li key={id} className="text-body-sm font-mono">
                    {id.startsWith('CVE-') ? (
                      <a href={nvdLink(id)} target="_blank" rel="noopener noreferrer" className="text-primary-fg hover:underline">
                        {id}
                      </a>
                    ) : (
                      id
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-body-sm font-semibold text-foreground mb-3">By tool</h3>
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-label font-medium text-foreground-subtle text-left">
                  <th scope="col" className="pb-2 font-medium">Tool</th>
                  <th scope="col" className="pb-2 font-medium">Severity</th>
                  <th scope="col" className="pb-2 font-medium">Score</th>
                  <th scope="col" className="pb-2 font-medium">Fix</th>
                  <th scope="col" className="pb-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {byTool.map(({ tool, fix }) => (
                  <tr key={tool} className="border-t border-border-subtle">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-foreground capitalize">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="inline-block w-2 h-2 rounded-full" style={{ background: toolColors[tool] }} />
                        {tool}
                      </span>
                    </th>
                    <td className="py-2 pr-3">{fix?.severity ? fix.severity.toUpperCase() : MISSING}</td>
                    <td className="py-2 pr-3 tabular-nums">{fix?.score === undefined ? MISSING : fix.score.toFixed(1)}</td>
                    <td className="py-2 pr-3">{packageFixText(fix) ?? MISSING}</td>
                    <td className="py-2">{fix?.source ?? MISSING}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-caption text-foreground-subtle mt-2">{MISSING} means the tool did not report this CVE on this package.</p>
          </section>

          <section>
            <h3 className="text-body-sm font-semibold text-foreground mb-3">CVSS</h3>
            {byTool.map(({ tool, fix }) => (
              <div key={tool} className="mb-3">
                <p className="text-body-sm font-medium text-foreground capitalize">{tool}</p>
                {!fix?.cvss?.length ? (
                  <p className="text-caption text-foreground-subtle">{MISSING}</p>
                ) : (
                  <ul className="mt-1 flex flex-col gap-2">
                    {fix.cvss.map((c, i) => (
                      <li key={i} className="text-caption text-foreground-muted">
                        <span className="font-medium text-foreground">{c.source ?? 'source not given'}</span>
                        {c.version && ` · v${c.version}`}
                        {c.score !== undefined && ` · ${c.score.toFixed(1)}`}
                        {c.vector && <code className="block font-mono break-all text-foreground-subtle">{c.vector}</code>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section>
            <h3 className="text-body-sm font-semibold text-foreground mb-3">Advisory</h3>
            {byTool.map(({ tool, fix }) => (
              <div key={tool} className="mb-3">
                <p className="text-body-sm font-medium text-foreground capitalize">{tool}</p>
                {!fix?.url ? (
                  <p className="text-caption text-foreground-subtle">{MISSING}</p>
                ) : (
                  <a
                    href={fix.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-caption text-primary-fg hover:underline break-all"
                  >
                    {fix.url}
                  </a>
                )}
              </div>
            ))}
          </section>
        </div>
      </motion.aside>
    </>
  );
}
