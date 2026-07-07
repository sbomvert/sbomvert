'use client';

import { JobLogEntry } from '@/services/storage';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

type Scan = {
  jobId: string;
  image?: string;
  status: string;
  updatedAt: string;
  history?: JobLogEntry[];
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

  if (loading) return <p className="mt-4 text-foreground-muted">Loading recent scans…</p>;
  if (!scans.length) return <p className="mt-4 text-foreground-muted">No recent scans found.</p>;

  const statusClass = (status: string) => {
    if (/^(completed|success)$/i.test(status)) {
      return 'text-success-fg bg-success-subtle border-success';
    }
    if (/^(failed|error)$/i.test(status)) {
      return 'text-error-fg bg-error-subtle border-error';
    }
    if (/^(running|partial|pending)$/i.test(status)) {
      return 'text-warning-fg bg-warning-subtle border-warning';
    }
    return 'text-info-fg bg-info-subtle border-info';
  };

  const levelClass = (level: string) => {
    switch (level) {
      case 'error':             return 'bg-error-subtle border-error text-error-fg';
      case 'warning':
      case 'warn':              return 'bg-warning-subtle border-warning text-warning-fg';
      default:                  return 'bg-info-subtle border-info text-info-fg';
    }
  };

  return (
    <div className="mt-4 border border-border rounded-card p-4 bg-surface-alt">
      <h3 className="text-heading-sm text-foreground mb-3">Recent Scans</h3>
      <ul className="space-y-3">
        {scans.map(scan => {
          const expanded = openJobId === scan.jobId;
          return (
            <li key={scan.jobId} className="border border-border rounded-panel bg-surface shadow-panel overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenJobId(prev => prev === scan.jobId ? null : scan.jobId)}
                className="w-full p-3 flex items-center justify-between gap-4 text-left hover:bg-surface-alt transition-colors"
                aria-expanded={expanded}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium text-foreground truncate">
                    {scan.image ?? 'Unknown image'}
                  </span>
                  <span className="block font-mono text-caption text-foreground-subtle truncate">
                    {scan.jobId}
                  </span>
                </span>

                <span className={`shrink-0 border text-body-sm font-medium px-2.5 py-1 rounded-pill ${statusClass(scan.status)}`}>
                  {scan.status}
                </span>

                <ChevronRight
                  size={16}
                  className={`shrink-0 text-foreground-muted transform transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border p-3 space-y-3">
                      <div className="text-caption text-foreground-subtle">
                        Updated: {new Date(scan.updatedAt).toLocaleString()}
                      </div>

                      {scan.history && scan.history.length > 0 ? (
                        <div className="space-y-2">
                          {scan.history.map((entry, i) => {
                            const level = (entry.level || 'info').toLowerCase();
                            return (
                              <div key={i} className={`border ${levelClass(level)} p-2 rounded-panel flex items-start gap-2`}>
                                <span className="font-mono text-caption uppercase">{level}</span>
                                <div className="text-caption">{entry.message}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-caption text-foreground-muted">No details available.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
