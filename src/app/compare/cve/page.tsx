'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { loadSbomImagesFromPublic } from '@/lib/sbomLoader';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { LoadingSpinner } from '@/components/hoc/LoadingSpinner';
import { ImageScanForm } from '@/components/hoc/ImageScanForm/ImageScanForm';
import { SearchBar } from '@/components/searchbar/SearchBar';
import { ImageInfo, ImageSelector } from '@/components/hoc/ImageSelector';
import { PageTitle } from '@/components/Title/Title';

export default function CveComparePage() {
  const router = useRouter();
  const setSelectedImage = useArtifactStore(s => s.setSelectedImage);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showScanForm, setShowScanForm] = useState(false);
  const [_, setJobIdState] = useState<string | null>(null);
  const [__, setJobStatus] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  // Load images
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { images: loadedImages, pagination } =
        await loadSbomImagesFromPublic(currentPage, searchTerm);
      setImages(loadedImages);
      setTotalPages(pagination.totalPages);
      setLoading(false);
    };
    loadData();
  }, [currentPage, searchTerm]);

  const filteredImages = useMemo(() => {
    return images.filter(
      img =>
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [images, searchTerm]);

  const handleImageSelect = (image: string) => {
    setSelectedImage(image);
    router.push('/compare/cve/report');
  };

  const handleSearch = (value: string) => setSearchInput(value);

  const handleScanSubmit = async (image: string, tools: { producers: string[]; consumers: string[] }) => {
    const payload = { image, tools };
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setJobIdState(data.jobId);
        setJobStatus('running');
        setShowScanForm(false);
      } else {
        alert(data.error || 'Failed to start scan');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to start scan');
    }
  };

  return (
    <>
      {/* SBOM comparison page – comparison type fixed to SBOM */}
      <PageTitle title="Compare CVE reports" subtitle='Select an artifact to compare vulnerability reports.'></PageTitle>
      {loading && <LoadingSpinner message="Loading SBOM files..." />}
      {!loading && (
        <>
          {showScanForm && FEATURE_FLAGS.ENABLE_SCAN_API && (
            <ImageScanForm
              onSubmit={handleScanSubmit}
              onCancel={() => setShowScanForm(false)}
            />
          )}
          <SearchBar value={searchInput} onChange={handleSearch} />
          <ImageSelector
            images={filteredImages as any}
            onImageSelect={handleImageSelect}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </>
  );
}
