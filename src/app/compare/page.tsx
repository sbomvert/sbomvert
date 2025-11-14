'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { ComparisonTypeSelector } from './components/ComparisonTypeSelector';
import { SearchBar } from './components/SearchBar';
import { ImageSelector, ImageInfo } from './components/ImageSelector';
import { ToolSelector } from './components/ToolSelector';
import { ComparisonViewSelector } from './components/ComparisonViewSelector';
import { SummaryView } from './components/SummaryView';
import { TableView } from './components/TableView';
import { ChartView } from './components/ChartView';
import { ExportButtons } from './components/ExportButtons';
import { LoadingSpinner } from './components/LoadingSpinner';
import { compareMultipleTools } from '@/lib/diffReports';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { ISbom } from '@/models/ISbom';
import { loadSbomImagesFromPublic, loadSbomsForImage } from '@/lib/sbomLoader';
import { TOOL_COLORS } from '@/lib/utils';

type ViewMode = 'summary' | 'table' | 'chart';
type ComparisonType = 'SBOM' | 'CVE';

export default function Home() {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('SBOM');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [sboms, setSboms] = useState<Record<string, ISbom[]>>({});
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
  // Filter images for search
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
const handleImageSelect = async (imageId: string) => {
  try {
    console.log("HERERER")
    const thesboms = await loadSbomsForImage(imageId);
    setSboms(thesboms.sboms);
    setSelectedImage(imageId);
    setViewMode('summary');
    setSelectedTools(new Set()); // Reset selected tools on new image selection
  } catch (error) {
    console.error('Error loading SBOM for image:', error);
  }
};

  // ------------------------------------------------------------
  // Get SBOMs for the currently selected image
  // ------------------------------------------------------------
  const currentSboms = useMemo(() => {
    if (!selectedImage) return [];
    return sboms[selectedImage] || [];
  }, [selectedImage, sboms]);

  // ------------------------------------------------------------
  // Initialize selected tools from SBOMs
  // ------------------------------------------------------------
  useEffect(() => {
    if (currentSboms.length > 0) {
      setSelectedTools(new Set(currentSboms.map(sbom => sbom.tool)));
    }
  }, [currentSboms]);

  // ------------------------------------------------------------
  // Compute comparison
  // ------------------------------------------------------------
  const comparison = useMemo<IMultiToolComparison | null>(() => {
    if (currentSboms.length < 2 || selectedTools.size < 2) return null;

    const filteredSboms = currentSboms.filter(sbom => selectedTools.has(sbom.tool));
    if (filteredSboms.length < 2) return null;

    return compareMultipleTools(filteredSboms);
  }, [currentSboms, selectedTools]);

  // ------------------------------------------------------------
  // Handle search input
  // ------------------------------------------------------------
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // ------------------------------------------------------------
  // Reset page state
  // ------------------------------------------------------------
  const handleReset = () => {
    setSelectedImage(null);
    setSearchTerm('');
    setViewMode('summary');
    setSelectedTools(new Set());
    setCurrentPage(1);
  };

  // ------------------------------------------------------------
  // Toggle tool selection
  // ------------------------------------------------------------
  const handleToolToggle = (toolName: string) => {
    setSelectedTools(prev => {
      const newSet = new Set(prev);

      if (newSet.has(toolName)) {
        if (newSet.size <= 2) {
          alert('You must have at least 2 tools selected for comparison');
          return prev;
        }
        newSet.delete(toolName);
      } else {
        newSet.add(toolName);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
      {/* ✔ Navbar uses global theme hook internally */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ComparisonTypeSelector
          comparisonType={comparisonType}
          onComparisonTypeChange={setComparisonType}
        />

        {loading && <LoadingSpinner message="Loading SBOM files..." />}

        {/* ------------------------------------------------------------
            IMAGE SELECTION SCREEN
           ------------------------------------------------------------ */}
        {!selectedImage && !loading && (
          <>
            <SearchBar value={searchTerm} onChange={handleSearch} />

            <ImageSelector
              images={filteredImages}
              onImageSelect={handleImageSelect}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {/* ------------------------------------------------------------
            SBOM ANALYSIS SCREEN
           ------------------------------------------------------------ */}
        {selectedImage && currentSboms.length > 0 && (
          <>
            <ToolSelector
              tools={currentSboms.map(s => s.toolInfo)}
              selectedTools={selectedTools}
              onToolToggle={handleToolToggle}
              colors={TOOL_COLORS}
            />

            {comparison && (
              <AnimatePresence mode="wait">
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-3xl font-bold text-foreground dark:text-white">
                      Analysis: {comparison.imageId}
                    </h2>

                    <div className="flex gap-3 flex-wrap">
                      <ComparisonViewSelector viewMode={viewMode} onViewModeChange={setViewMode} />
                      <ExportButtons comparison={comparison} />

                      <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 
                                   text-gray-700 dark:text-gray-300 
                                   rounded-lg hover:bg-gray-300 
                                   dark:hover:bg-gray-600 transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </div>

                  {viewMode === 'summary' && <SummaryView comparison={comparison} />}
                  {viewMode === 'table' && <TableView comparison={comparison} />}
                  {viewMode === 'chart' && <ChartView comparison={comparison} />}
                </div>
              </AnimatePresence>
            )}

            {!comparison && selectedTools.size >= 2 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  Please select at least 2 tools to compare
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
