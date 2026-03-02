'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComparisonTypeSelector } from '../../components/hoc/ComparisonTypeSelector';
import { SearchBar } from '../../components/searchbar/SearchBar';
import { ImageSelector, ImageInfo } from '../../components/hoc/ImageSelector';
import { LoadingSpinner } from '../../components/hoc/LoadingSpinner';
import { loadSbomImagesFromPublic } from '@/lib/sbomLoader';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button/Button';
import { Upload } from 'lucide-react';
import { SbomUploadForm } from '../../components/hoc/SbomUploadForm';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

type ComparisonType = 'SBOM' | 'CVE';

export default function Home() {
  const router = useRouter();
  const setSelectedImage = useArtifactStore(s => s.setSelectedImage);
  const [comparisonType, setComparisonType] = useState<ComparisonType>('SBOM');
  const [searchInput, setSearchInput] = useState(''); // Local input state
  const [searchTerm, setSearchTerm] = useState(''); // Debounced search term
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // ------------------------------------------------------------
  // Debounce search input (500ms delay)
  // ------------------------------------------------------------
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchInput]);

  // ------------------------------------------------------------
  // Load paginated images
  // ------------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { images: loadedImages, pagination } = await loadSbomImagesFromPublic(
        currentPage,
        searchTerm
      );
      setImages(loadedImages);
      setTotalPages(pagination.totalPages);
      setLoading(false);
    };
    loadData();
  }, [currentPage, searchTerm]);

  // ------------------------------------------------------------
  // Filter images for search (client-side filtering)
  // ------------------------------------------------------------
  const filteredImages = useMemo(() => {
    return images.filter(
      img =>
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [images, searchTerm]);

  // ------------------------------------------------------------
  // Load SBOMs for selected image
  // ------------------------------------------------------------
  const handleImageSelect = async (image: string) => {
    setSelectedImage(image);
    router.push('/compare/artifact');
  };

  const handleComparisonTypeChange = (type: 'SBOM' | 'CVE') => {
  if (type === 'CVE') {
    router.push('/compare/cve');
  }
};

const handleSearch = (value: string) => {
  setSearchInput(value);
};

  // ------------------------------------------------------------
  // Handle SBOM upload
  // ------------------------------------------------------------
  const handleUpload = async (name: string, containerName: string, file: File) => {
    // Prepare form data for the upload API
    const formData = new FormData();
    formData.append('name', name);
    formData.append('containerName', containerName);
    formData.append('file', file);

    try {
      const response = await fetch('/api/sbom/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      alert(`SBOM "${name}" uploaded successfully for container "${containerName}"`);
      console.log('Upload result:', result);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload SBOM: ${(error as Error).message}`);
    } finally {
      // Reset form and hide upload regardless of success
      setShowUploadForm(false);
    }
  };

  const handleScan = async () => {
    const image = window.prompt('Enter image name (e.g., repo/app:tag)');
    if (!image) return;
    const payload = {
      image,
      tools: ['trivy', 'syft', 'grype', 'scout'],
    };
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Scan started. Job ID: ${data.jobId}`);
      } else {
        alert(`Scan failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to start scan');
    }
  };
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-end mb-4">
        {FEATURE_FLAGS.ENABLE_SBOM_UPLOAD && (
          <Button variant="secondary" size="md" onClick={() => setShowUploadForm(!showUploadForm)}>
            <Upload size={20} />
            Upload SBOM
          </Button>
        )}
        {/* Scan button */}
        <Button variant="primary" size="md" onClick={handleScan} className="ml-2">
          Scan Image
        </Button>
      </div>
      <ComparisonTypeSelector
        comparisonType={comparisonType}
        onComparisonTypeChange={setComparisonType}
      />
      {loading && <LoadingSpinner message="Loading SBOM files..." />}
      {/* ------------------------------------------------------------
            IMAGE SELECTION
           ------------------------------------------------------------ */}
      {!loading && (
        <>
          {showUploadForm && FEATURE_FLAGS.ENABLE_SBOM_UPLOAD && (
            <SbomUploadForm onUpload={handleUpload} onCancel={() => setShowUploadForm(false)} />
          )}
          <SearchBar value={searchInput} onChange={handleSearch} />
          <ImageSelector
            images={filteredImages}
            onImageSelect={handleImageSelect}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </main>
  );
}
