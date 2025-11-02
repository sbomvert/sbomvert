'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Shield,
  Package,
  Download,
  FileJson,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { ToolInfoCard } from './compare/components/ToolInfoCard';
import { MultiToolSummary } from './compare/components/ComparisonSummary';
import { PackageDetailsTable } from './compare/components/PackageDetailsTable';
import { compareMultipleTools } from '@/lib/diffReports';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { MOCK_SBOMS, EXAMPLE_IMAGES } from '@/lib/mockData';
import { TOOL_COLORS } from '@/lib/utils';

type ViewMode = 'summary' | 'table' | 'chart';
type PackageFilter = 'all' | 'common' | 'unique';

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [comparisonType, setComparisonType] = useState<'SBOM' | 'CVE'>('SBOM');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [comparison, setComparison] = useState<IMultiToolComparison | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [packageFilter, setPackageFilter] = useState<PackageFilter>('all');

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

  const filteredImages = EXAMPLE_IMAGES.filter(
    img =>
      img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImageSelect = (imageId: string) => {
    setSelectedImage(imageId);
    const sboms = MOCK_SBOMS[imageId];
    if (sboms && sboms.length >= 2) {
      const result = compareMultipleTools(sboms);
      setComparison(result);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setComparison(null);
    setViewMode('summary');
    setSearchTerm('');
  };

  const handleExport = (format: 'pdf' | 'json') => {
    if (format === 'json' && comparison) {
      const exportData = {
        imageId: comparison.imageId,
        tools: comparison.tools,
        statistics: comparison.statistics,
        packages: Array.from(comparison.allPackages.entries()).map(([key, value]) => ({
          key,
          package: value.package,
          foundInTools: value.foundInTools,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sbom-comparison-${comparison.imageId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('PDF export would use libraries like jsPDF or react-pdf to generate a formatted report');
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'dark bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <Navbar isDark={isDark} toggleTheme={() => setIsDark(!isDark)} onLogoClick={handleReset} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Comparison Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Select Comparison Type</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setComparisonType('SBOM')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                comparisonType === 'SBOM'
                  ? 'bg-indigo-600 text-white shadow-lg scale-105'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md'
              }`}
            >
              <FileText size={20} />
              SBOM Comparison
            </button>
            <button
              onClick={() => setComparisonType('CVE')}
              disabled
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            >
              <Shield size={20} />
              CVE Comparison (Coming Soon)
            </button>
          </div>
        </motion.div>

        {/* Search Bar */}
        {!selectedImage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search container images..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
              />
            </div>
          </motion.div>
        )}

        {/* Image Selection */}
        {!selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {filteredImages.map((image, idx) => (
              <motion.button
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => handleImageSelect(image.id)}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all hover:scale-105 text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Package className="text-indigo-600 dark:text-indigo-400" size={24} />
                  <h3 className="font-bold dark:text-white">{image.name}</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{image.description}</p>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Tool Information Section */}
        {comparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Tools Being Compared</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparison.tools.map((tool, idx) => (
                <ToolInfoCard key={tool.name} toolInfo={tool} color={TOOL_COLORS[idx]} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Comparison Dashboard */}
        {comparison && (
          <AnimatePresence>
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-3xl font-bold dark:text-white">
                  Analysis: {comparison.imageId}
                </h2>
                <div className="flex gap-3 flex-wrap">
                  <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
                    <button
                      onClick={() => setViewMode('summary')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        viewMode === 'summary'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        viewMode === 'table'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode('chart')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        viewMode === 'chart'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Charts
                    </button>
                  </div>
                  <button
                    onClick={() => handleExport('json')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <FileJson size={18} />
                    Export JSON
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Download size={18} />
                    Export PDF
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>

              {viewMode === 'summary' && <MultiToolSummary comparison={comparison} />}

              {viewMode === 'chart' && <MultiToolSummary comparison={comparison} />}

              {viewMode === 'table' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold dark:text-white">Package Details</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPackageFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          packageFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        All ({comparison.allPackages.size})
                      </button>
                      <button
                        onClick={() => setPackageFilter('common')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          packageFilter === 'common'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Common ({comparison.statistics.commonToAll})
                      </button>
                      <button
                        onClick={() => setPackageFilter('unique')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          packageFilter === 'unique'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Unique Only
                      </button>
                    </div>
                  </div>
                  <PackageDetailsTable comparison={comparison} filter={packageFilter} />
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
