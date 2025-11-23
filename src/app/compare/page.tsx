'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComparisonTypeSelector } from './components/ComparisonTypeSelector';
import { SearchBar } from './components/SearchBar';
import { ImageSelector, ImageInfo } from './components/ImageSelector';
import { LoadingSpinner } from './components/LoadingSpinner';
import { loadSbomImagesFromPublic } from '@/lib/sbomLoader';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';

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


  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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