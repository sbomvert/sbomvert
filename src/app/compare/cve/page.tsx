'use client';
import { useEffect, useState } from 'react';
import { useArtifactStore } from '@/store/useArtifactStore';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/hoc/LoadingSpinner';
import { CVEReport, loadCVEsForImage } from '@/lib/vuln/vulnLoader';
import { ToolSelector } from '@/components/hoc/ToolSelector';
import { TOOL_COLORS } from '@/lib/utils';
import { IToolInfo } from '@/models/ISbom';
import { ChartView } from '@/components/hoc/ChartView';
import { ExportButtons } from '@/components/hoc/ExportButtons';
import { SummaryView } from '@/components/hoc/SBOMSummaryView';
import { TableView } from '@/components/hoc/TableView';
import { AnimatePresence } from 'framer-motion';
import { SBOMComparisonViewSelector } from '@/components/hoc/SBOMComparisonViewSelector';

type ViewMode = 'summary' | 'table' | 'chart';

export default function CVEPage() {
  const router = useRouter();
  const selectedImage = useArtifactStore(s => s.selectedImage);
  const [cves, setCves] = useState<CVEReport>({});
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [tools, setTools] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedImage) {
      router.replace('/compare');
      return;
    }
    const fetchData = async () => {
      setLoading(true)

      const response = await loadCVEsForImage(selectedImage);
      console.log(response.cves)
      setCves(response.cves)
      setViewMode('summary');
      // Set selected tools after data is loaded
      setTools(new Set(Object.keys(response.cves) || []))
      setSelectedTools(new Set(Object.keys(response.cves) || []));

      setLoading(false);

    };
    fetchData();
  }, [selectedImage]);

  if (loading) return <LoadingSpinner message="Loading CVE data..." />;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold mb-4">CVE Comparison for {selectedImage}</h2>
      <ToolSelector
        tools={Array.from(tools).map((tool: string): IToolInfo => ({
          name: tool
        }))} selectedTools={selectedTools}
        onToolToggle={() => { }}
        colors={TOOL_COLORS}
      />
      <AnimatePresence mode="wait">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-3xl font-bold text-foreground dark:text-white">
                    Analysis: {selectedImage}
                  </h2>

                  <div className="flex gap-3 flex-wrap">
                    <SBOMComparisonViewSelector viewMode={viewMode} onViewModeChange={setViewMode} />
                    
                  </div>
                </div>
              </div>
            </AnimatePresence>
    </main>
  );
}
