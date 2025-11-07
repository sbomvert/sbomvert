'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { ComparisonTypeSelector } from './compare/components/ComparisonTypeSelector';
import { SearchBar } from './compare/components/SearchBar';
import { ImageSelector, ImageInfo } from './compare/components/ImageSelector';
import { ToolSelector } from './compare/components/ToolSelector';
import { ComparisonViewSelector } from './compare/components/ComparisonViewSelector';
import { SummaryView } from './compare/components/SummaryView';
import { TableView } from './compare/components/TableView';
import { ChartView } from './compare/components/ChartView';
import { ExportButtons } from './compare/components/ExportButtons';
import { LoadingSpinner } from './compare/components/LoadingSpinner';
import { compareMultipleTools } from '@/lib/diffReports';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { ISbom } from '@/models/ISbom';
import { loadSbomsFromPublic, loadSbomsForImage } from '@/lib/sbomLoader';
import { TOOL_COLORS } from '@/lib/utils';

type ViewMode = 'summary' | 'table' | 'chart';
type ComparisonType = 'SBOM' | 'CVE';

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [comparisonType, setComparisonType] = useState<ComparisonType>('SBOM');
  const [searchTerm, setSearchTerm] = useState('');
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [sboms, setSboms] = useState<Record<string, ISbom[]>>({});
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dark mode effect
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDark]);

  // Load data when page or search changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { images: loadedImages, pagination } = await loadSbomsFromPublic(currentPage, searchTerm);
      setImages(loadedImages);
      setTotalPages(pagination.totalPages);
      setLoading(false);
    };

    loadData();
  }, [currentPage, searchTerm]);

  // Filter images based on search term
  const filteredImages = useMemo(() => {
    return images.filter(
      img =>
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [images, searchTerm]);

  // Load images when page or search changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { images: loadedImages, pagination } = await loadSbomsFromPublic(currentPage, searchTerm);
      setImages(loadedImages);
      setTotalPages(pagination.totalPages);
      setLoading(false);
    };

    loadData();
  }, [currentPage, searchTerm]);

  // Get current image SBOMs
  const currentSboms = useMemo(() => {
    if (!selectedImage) return [];
    return sboms[selectedImage] || [];
  }, [selectedImage, sboms]);

  // Initialize selected tools when image is selected
  useEffect(() => {
    if (currentSboms.length > 0) {
      setSelectedTools(new Set(currentSboms.map(sbom => sbom.tool)));
    }
  }, [currentSboms]);

  // Calculate comparison based on selected tools
  const comparison = useMemo<IMultiToolComparison | null>(() => {
    if (currentSboms.length < 2 || selectedTools.size < 2) return null;

    const filteredSboms = currentSboms.filter(sbom => selectedTools.has(sbom.tool));
    if (filteredSboms.length < 2) return null;

    return compareMultipleTools(filteredSboms);
  }, [currentSboms, selectedTools]);

  const handleImageSelect = async (imageId: string) => {
    const thesboms = await loadSbomsForImage(imageId)
    console.log(thesboms)
    setSboms(thesboms.sboms)
    setSelectedImage(imageId);
    setViewMode('summary');
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSearchTerm('');
    setViewMode('summary');
    setSelectedTools(new Set());
    setCurrentPage(1);
  };

  const handleToolToggle = (toolName: string) => {
    setSelectedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        // Don't allow deselecting if only 2 tools are selected
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
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'dark bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <Navbar isDark={isDark} toggleTheme={() => setIsDark(!isDark)} onLogoClick={handleReset} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ComparisonTypeSelector
          comparisonType={comparisonType}
          onComparisonTypeChange={setComparisonType}
        />

        {loading && <LoadingSpinner message="Loading SBOM files..." />}

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
                    <h2 className="text-3xl font-bold dark:text-white">
                      Analysis: {comparison.imageId}
                    </h2>
                    <div className="flex gap-3 flex-wrap">
                      <ComparisonViewSelector
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                      />
                      <ExportButtons comparison={comparison} />
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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