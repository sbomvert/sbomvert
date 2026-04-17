'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, ChevronRight, Loader2 } from 'lucide-react';
import { formatContainerName, reverseFormatContainerName } from '@/lib/container/containerUtils';
import { PageTitle } from '@/components/Title/Title';
import { SearchBar } from '@/components/searchbar/SearchBar';
import { Card } from '@/components/card/Card';
import { List } from '@/components/list/List';
import { Button } from '@/components/button/Button';
import { SbomUploadForm } from '@/components/hoc/SbomUploadForm';
import { AnalyzeSPDX } from '@/lib/sbom/spdx/parser';
import { useSbomStore } from '@/store/useSbomStore';

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
  const fmt = parts[1]?.toUpperCase();
  return fmt ? `${tool} · ${fmt}` : tool;
}

export default function AnalyzePage() {
  const router = useRouter();
  const setSbom = useSbomStore((s) => s.setSbom);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  // <SbomUploadForm onUpload={handleUpload} />
  const [openContainer, setOpenContainer] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    fetchContainers(1, debouncedSearch)
      .then(d => setContainers(d.containers ?? []))
      .catch(() => setContainers([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  const handleSelect = (container: Container, file: SbomFile) => {
    const imageSlug = reverseFormatContainerName(formatContainerName(container.name));
    const toolSlug = encodeURIComponent(file.name);
    router.push(`/compare/analyze/${encodeURIComponent(imageSlug)}/${toolSlug}`);
  };

  const handleUpload = async (name: string, containerName: string, file: File) => {
    const text = await file.text();
    const json = JSON.parse(text);

    const parsed = AnalyzeSPDX(json, 'Local SBOM');

    setSbom({ ...parsed, name, containerName });

    router.push(`/compare/analyze/local`);

  }

  return (
    <>
      <PageTitle title="Analyze SBOM" subtitle="Select an image and scanner to inspect its full package manifest." />

      <div className="flex items-start">
        <SearchBar value={search} onChange={e => setSearch(e)} placeholder='Filter artifacts…' classname="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" size={15} />
        <div className="ml-auto">
          <Button size='sm' onClick={() => setLoadModalOpen(true)}>
            Load SBOM
          </Button>
        </div>
      </div>

      {loadModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="rounded-lg p-6 w-full max-w-md">
            <SbomUploadForm
              onUpload={(name, containerName, file) => {
                handleUpload(name, containerName, file);
                setLoadModalOpen(false);
              }}
              onCancel={() => setLoadModalOpen(false)}
            />
          </div>
        </div>
      )}

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
          {containers.map((container, ci) => {
            const isOpen = openContainer === container.name;

            return (
              <motion.div
                key={container.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.04 }}
                className="relative bg-surface rounded-card-lg border border-border shadow-card overflow-visible"
              >
                {/* Header (clickable toggle) */}
                <Card
                  className="cursor-pointer flex items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle"
                  onClick={() =>
                    setOpenContainer(isOpen ? null : container.name)
                  }
                >
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-info" />
                    <p className="font-semibold text-body-sm text-foreground">
                      {formatContainerName(container.name)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-caption text-foreground-muted">
                      {container.files.length} SBOM
                      {container.files.length !== 1 ? 's' : ''} available
                    </p>
                    <ChevronRight
                      size={16}
                      className={`transition-transform ${isOpen ? 'rotate-90' : ''
                        }`}
                    />
                  </div>
                </Card>

                {/* Dropdown */}
                {isOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-surface border border-border rounded-card-lg shadow-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <List
                        items={container.files}
                        getId={(file) => file.name}
                        getLabel={(file) => toolLabel(file.name)}
                        onSelect={(file) => handleSelect(container, file)}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}