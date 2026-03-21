'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { loadSbomImagesFromPublic } from '@/lib/sbomLoader';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/hoc/LoadingSpinner';
import { SearchBar } from '@/components/searchbar/SearchBar';
import { ImageInfo, ImageSelector } from '@/components/hoc/ImageSelector';


export default function Home() {
  const router = useRouter();
  const setSelectedImage = useArtifactStore(s => s.setSelectedImage);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);



  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  /* ------------------ Search Debounce ------------------ */
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

  /* ------------------ Load Images ------------------ */
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


  /* ------------------ Filtering ------------------ */
  const filteredImages = useMemo(() => {
    return images.filter(
      img =>
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [images, searchTerm]);

  /* ------------------ Handlers ------------------ */

  const handleImageSelect = (image: string) => {
    setSelectedImage(image);
    // TODO do something
  };

  const handleSearch = (value: string) => setSearchInput(value);




  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
     <h1 className="text-3xl font-semibold mb-6">Available images</h1>

      {loading && <LoadingSpinner message="Loading SBOM files..." />}

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