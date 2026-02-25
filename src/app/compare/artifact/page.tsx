'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ToolSelector } from '../components/ToolSelector';
import { ComparisonViewSelector } from '../components/ComparisonViewSelector';
import { SummaryView } from '../components/SummaryView';
import { TableView } from '../components/TableView';
import { ChartView } from '../components/ChartView';
import { ExportButtons } from '../components/ExportButtons';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { compareMultipleTools } from '@/lib/diffReports';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { ISbom } from '@/models/ISbom';
import { loadSbomsForImage } from '@/lib/sbomLoader';
import { useRouter } from 'next/navigation';
import { TOOL_COLORS } from '@/lib/utils';
import { useArtifactStore } from '@/store/useArtifactStore';

type ViewMode = 'summary' | 'table' | 'chart';

export default function Home() {
  const router = useRouter();
  const selectedImage = useArtifactStore(s => s.selectedImage);

  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [sboms, setSboms] = useState<Record<string, ISbom[]>>({});
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------
  // Load paginated images
  // ------------------------------------------------------------
  useEffect(() => {
    // This effect is just for setting loading state, no setState needed
  }, []);

  useEffect(() => {
    if (!selectedImage) {
      router.replace('/compare');
    }
  }, [selectedImage, router]);

  useEffect(() => {
    if (!selectedImage) return;

    const loadData = async () => {
      setLoading(true);
      const response = await loadSbomsForImage(selectedImage);

      setSboms(response.sboms);
      setViewMode('summary');
      // Set selected tools after data is loaded
      const tools = new Set(response.sboms[selectedImage]?.map(sbom => sbom.tool) || []);
      setSelectedTools(tools);
      setLoading(false);
    };

    loadData();
  }, [selectedImage]);

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
    // Initialize selected tools from SBOMs without calling setState directly in effect
    // This should be handled in the loadData function instead
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {loading && <LoadingSpinner message="Loading SBOMs ..." />}

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
  );
}
