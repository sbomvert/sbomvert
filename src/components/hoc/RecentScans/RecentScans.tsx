'use client';

import { JobLogEntry } from '@/services/storage';
import { useEffect, useState } from 'react';

type Scan = {
  jobId: string;
  status: string;
  updatedAt: string;
  history?: JobLogEntry[];
};

export function RecentScans() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

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
        {scans.map(scan => (
          <li key={scan.jobId} className="border border-border rounded-panel p-3 bg-surface shadow-panel">
            <div className="flex justify-between">
              <span className="font-mono text-body-sm text-foreground">{scan.jobId}</span>
              {/^(completed|success)$/i.test(scan.status) && (
                <span className="text-body-sm font-medium text-success-fg bg-success-subtle px-2 py-0.5 rounded-pill">
                  {scan.status}
                </span>
              )}
            </div>
            <div className="text-caption text-foreground-subtle mt-1">
              Updated: {new Date(scan.updatedAt).toLocaleString()}
            </div>
            {scan.history && scan.history.length > 0 && (
              <div className="mt-2 space-y-2">
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
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
