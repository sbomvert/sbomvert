'use client';
import React, { useEffect, useState } from 'react';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/hoc/LoadingSpinner';

interface CVE {
  id: string;
  description?: string;
  // tool-specific info can be added later
}

export default function CVEPage() {
  const router = useRouter();
  const selectedImage = useArtifactStore(s => s.selectedImage);
  const [cves, setCves] = useState<CVE[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedImage) {
      router.replace('/compare');
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/cve?image=${encodeURIComponent(selectedImage)}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setCves(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setCves([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedImage, router]);

  if (loading) return <LoadingSpinner message="Loading CVE data..." />;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold mb-4">CVE Comparison for {selectedImage}</h2>
      {cves.length === 0 ? (
        <p>No CVE data available.</p>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">CVE ID</th>
              <th className="border px-2 py-1">Description</th>
            </tr>
          </thead>
          <tbody>
            {cves.map((cve) => (
              <tr key={cve.id}>
                <td className="border px-2 py-1">{cve.id}</td>
                <td className="border px-2 py-1">{cve.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
