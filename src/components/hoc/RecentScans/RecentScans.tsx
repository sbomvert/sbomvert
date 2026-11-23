'use client';

import type { ScanLogEntry } from '@sbomvert/scan/queue';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

type Scan = {
  jobId: string;
  image?: string;
  status: string;
  updatedAt: string;
  history?: ScanLogEntry[];
};

export function RecentScans() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchRecent = async () => {
      try {
        const res = await fetch('/api/scan/status/recent');
        if (!mounted) return;
        if (res.ok) setScans(await res.json());
      } catch (e) {
        console.error('Failed to fetch recent scans', e);
      } finally {
        if (!mounted) return;
        setLoading(false);
        timer = setTimeout(fetchRecent, 5000);
      }
    };

    fetchRecent();
    return () => { mounted = false; if (timer) clearTimeout(timer); };
  }, []);

  if (loading) return <p className="text-body-sm text-foreground-muted">Loading recent scans…</p>;
  if (!scans.length) return <p className="text-body-sm text-foreground-muted">No recent scans found</p>;

  // status is the one place this panel uses colour: a dot, with the word next to it
  const statusDot = (status: string) => {
    if (/^(completed|success)$/i.test(status)) return 'bg-success';
    if (/^(failed|error)$/i.test(status)) return 'bg-error';
    if (/^(running|partial|pending)$/i.test(status)) return 'bg-warning';
    return 'bg-info';
  };

  const levelClass = (level: string) => {
    switch (level) {
      case 'error':             return 'text-error-fg';
      case 'warning':
      case 'warn':              return 'text-warning-fg';
      default:                  return 'text-foreground-subtle';
    }
  };

  return (
    <section className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
      <h2 className="text-heading-sm text-foreground px-card-p-lg pt-card-p pb-3">Recent scans</h2>
      <ul className="divide-y divide-border border-t border-border">
        {scans.map(scan => {
          const expanded = openJobId === scan.jobId;
          return (
            <li key={scan.jobId}>
              <button
                type="button"
                onClick={() => setOpenJobId(prev => prev === scan.jobId ? null : scan.jobId)}
                className="w-full px-card-p-lg py-3 flex items-center gap-4 text-left hover:bg-surface-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-expanded={expanded}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-body-sm text-foreground truncate">
                    {scan.image ?? 'Unknown image'}
                  </span>
                  <span className="block font-mono text-caption text-foreground-subtle truncate">
                    {scan.jobId}
                  </span>
                </span>

                <span className="shrink-0 w-28 inline-flex items-center gap-2 text-body-sm text-foreground-muted">
                  <span className={`size-2 rounded-full shrink-0 ${statusDot(scan.status)}`} aria-hidden />
                  {scan.status}
                </span>

                <ChevronRight
                  size={16}
                  className={`shrink-0 text-foreground-subtle transition-transform ${expanded ? 'rotate-90' : ''}`}
                  aria-hidden
                />
              </button>

              {expanded && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-card-p-lg pb-4">
                  <p className="text-caption text-foreground-subtle mb-2">
                    Updated: {new Date(scan.updatedAt).toLocaleString()}
                  </p>

                  {scan.history && scan.history.length > 0 ? (
                    // the worker's log, read like a terminal: one line per entry, the level in its own column
                    <ol className="rounded-input bg-surface-alt border border-border p-3 space-y-1 font-mono text-caption">
                      {scan.history.map((entry, i) => {
                        const level = (entry.level || 'info').toLowerCase();
                        return (
                          <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-2">
                            <span className={`uppercase ${levelClass(level)}`}>{level}</span>
                            <span className="text-foreground-muted break-words min-w-0">{entry.message}</span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-caption text-foreground-muted">No details available</p>
                  )}
                </motion.div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
