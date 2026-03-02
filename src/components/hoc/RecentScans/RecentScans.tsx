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
                if (res.ok) {
                    const data = await res.json();
                    setScans(data);
                }
            } catch (e) {
                console.error('Failed to fetch recent scans', e);
            } finally {
                if (!mounted) return;
                setLoading(false);
                // schedule next poll in 5s
                timer = setTimeout(fetchRecent, 5000);
            }
        };

        fetchRecent();

        return () => {
            mounted = false;
            if (timer) clearTimeout(timer);
        };
    }, []);


    if (loading) {
        return <p className="mt-4">Loading recent scans...</p>;
    }

    if (!scans.length) {
        return <p className="mt-4 text-gray-500">No recent scans found.</p>;
    }

    return (
        <div className="mt-4 border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">Recent Scans</h3>

            <ul className="space-y-3">
                {scans.map(scan => (
                    <li
                        key={scan.jobId}
                        className="border rounded p-3 bg-white shadow-sm"
                    >
                        <div className="flex justify-between">
                            <span className="font-mono text-sm">{scan.jobId}</span>
                            <span
                                className={`text-sm font-medium ${/^(completed|success)$/i.test(scan.status) ? 'text-green-600 bg-green-50 px-2 py-0.5 rounded' : ''
                                    }`}
                            >
                                {scan.status}
                            </span>
                        </div>


                        <div className="text-xs text-gray-500 mt-1">
                            Updated: {new Date(scan.updatedAt).toLocaleString()}
                        </div>

                        {scan.history && scan.history.length > 0 && (
                            <div className="mt-2 space-y-2">
                                {scan.history.map((entry, i) => {
                                    const level = (entry.level || 'info').toLowerCase();
                                    const bg =
                                        level === 'error'
                                            ? 'bg-red-100 border-red-300 text-red-800'
                                            : level === 'warning' || level === 'warn'
                                                ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                                                : 'bg-blue-50 border-blue-200 text-blue-800';

                                    return (
                                        <div
                                            key={i}
                                            className={`border ${bg} p-2 rounded flex items-start gap-2`}
                                        >
                                            <span className="font-mono text-xs uppercase">{level}</span>
                                            <div className="text-xs">{entry.message}</div>
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