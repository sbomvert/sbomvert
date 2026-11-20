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
import { SbomDetails, SbomUploadForm } from '@/components/hoc/SbomUploadForm';
import { Dialog } from '@/components/dialog/Dialog';
import { AnalyzeSPDX } from '@/lib/sbom/spdx/parser';
import { AnalyzeCycloneDX } from '@/lib/sbom/cyclonedx/parser';
import { useSbomStore } from '@/store/useSbomStore';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

interface SbomFile { name: string; }
interface Container { name: string; files: SbomFile[]; }

async function fetchContainers(page: number, search: string) {
  const res = await fetch(`/api/sbom-files?page=${page}&search=${encodeURIComponent(search)}`);
  if (!res.ok) return { containers: [], pagination: { totalPages: 1 } };
  return res.json();
}

// the image or software the SBOM is about, when it says so
function subjectOf(doc: { metadata?: { component?: { name?: string; version?: string } }; name?: string }): string | undefined {
  const component = doc.metadata?.component;
  if (component?.name) return component.version ? `${component.name}:${component.version}` : component.name;
  return doc.name;
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
  const [openContainer, setOpenContainer] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    // the static build has no stored SBOMs
    if (FEATURE_FLAGS.STATIC_MODE) return;
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

  // the form has checked the SBOM: its format, and the tool as the user confirmed it
  const handleUpload = async (name: string, containerName: string, file: File, details: SbomDetails) => {
    const json = JSON.parse(await file.text());
    const parsed = details.format === 'cdx' ? AnalyzeCycloneDX(json, 'Local SBOM', file.name) : AnalyzeSPDX(json, 'Local SBOM');

    setSbom({
      ...parsed,
      info: { ...parsed.info, tool: details.tool },
      // not asked in the static build: what the SBOM says (e.g. "docker-scout.cdx.json", "docker:29.9.3")
      name: name || `${details.tool.toLowerCase().replace(/\s+/g, '-')}.${details.format}.json`,
      containerName: containerName || subjectOf(json) || 'Local SBOM',
    });

    router.push(`/compare/analyze/local`);
  };

  if (FEATURE_FLAGS.STATIC_MODE) {
    return (
      <>
        <PageTitle title="Analyze SBOM" subtitle="Open an SPDX or CycloneDX SBOM from your computer to inspect its full package manifest." />
        <SbomUploadForm submitText="Load SBOM" allowPaste askNames={false} onUpload={handleUpload} />
      </>
    );
  }

  return (
    <>
      <PageTitle title="Analyze SBOM" subtitle="Select an image and scanner to inspect its full package manifest." />

      <div className="flex items-start">
        <SearchBar value={search} onChange={e => setSearch(e)} placeholder='Filter artifacts…' iconClassName="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" size={15} />
        <div className="ml-auto">
          <Button size='sm' onClick={() => setLoadModalOpen(true)}>
            Load SBOM
          </Button>
        </div>
      </div>

      <Dialog open={loadModalOpen} onOpenChange={setLoadModalOpen} title="Load SBOM" description="Open an SPDX or CycloneDX SBOM from your computer to analyze it.">
        <SbomUploadForm
          submitText="Load SBOM"
          allowPaste
          className="p-0 shadow-none bg-transparent max-w-none"
          onUpload={async (name, containerName, file, details) => {
            // a failure throws to the form, which shows it; the dialog stays open
            await handleUpload(name, containerName, file, details);
            setLoadModalOpen(false);
          }}
          onCancel={() => setLoadModalOpen(false)}
        />
      </Dialog>

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