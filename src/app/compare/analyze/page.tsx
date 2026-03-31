'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, Search, Package, ChevronRight, Loader2 } from 'lucide-react';
import { formatContainerName, reverseFormatContainerName } from '@/lib/container/containerUtils';
import { PageTitle } from '@/components/Title/Title';

interface SbomFile { name: string; }
interface Container { name: string; files: SbomFile[]; }

async function fetchContainers(page: number, search: string) {
  const res = await fetch(`/api/sbom-files?page=${page}&search=${encodeURIComponent(search)}`);
  if (!res.ok) return { containers: [], pagination: { totalPages: 1 } };
  return res.json();
}

function toolLabel(filename: string): string {
  const parts = filename.replace('.json', '').split('.');
  const tool = parts[0] ?? filename;
  const fmt  = parts[1]?.toUpperCase();
  return fmt ? `${tool} · ${fmt}` : tool;
}

export default function AnalyzePage() {
  const router = useRouter();
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [containers, setContainers]     = useState<Container[]>([]);
  const [loading, setLoading]           = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchContainers(1, debouncedSearch)
      .then(d => setContainers(d.containers ?? []))
      .catch(() => setContainers([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  const handleSelect = (container: Container, file: SbomFile) => {
    const imageSlug = reverseFormatContainerName(formatContainerName(container.name));
    const toolSlug  = encodeURIComponent(file.name);
    router.push(`/compare/analyze/${encodeURIComponent(imageSlug)}/${toolSlug}`);
  };

  return (
    <>
      <PageTitle title="Analyze SBOM" subtitle="Select an image and scanner to inspect its full package manifest." />

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
        <input
          type="text"
          placeholder="Filter images…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-body-sm rounded-input border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-foreground-subtle"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-body-sm text-foreground-muted py-10 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : containers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Package size={32} className="text-foreground-subtle" />
          <p className="text-foreground-muted">No SBOMs found. Upload one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {containers.map((container, ci) => (
            <motion.div
              key={container.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.04 }}
              className="bg-surface rounded-card-lg border border-border shadow-card overflow-hidden"
            >
              {/* Image header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
                <div className="w-8 h-8 rounded-panel bg-info-subtle flex items-center justify-center shrink-0">
                  <Package size={16} className="text-info" />
                </div>
                <div>
                  <p className="font-semibold text-body-sm text-foreground">{formatContainerName(container.name)}</p>
                  <p className="text-caption text-foreground-muted">
                    {container.files.length} SBOM{container.files.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>

              {/* Tool list */}
              <div className="divide-y divide-border-subtle">
                {container.files.map(file => (
                  <button
                    key={file.name}
                    onClick={() => handleSelect(container, file)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-info-subtle transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={14} className="text-foreground-subtle group-hover:text-info transition-colors" />
                      <span className="text-body-sm text-foreground font-medium capitalize">
                        {toolLabel(file.name)}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-foreground-subtle group-hover:text-info transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
