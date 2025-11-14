import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield } from 'lucide-react';

type ComparisonType = 'SBOM' | 'CVE';

interface ComparisonTypeSelectorProps {
  comparisonType: ComparisonType;
  onComparisonTypeChange: (type: ComparisonType) => void;
}

export const ComparisonTypeSelector: React.FC<ComparisonTypeSelectorProps> = ({
  comparisonType,
  onComparisonTypeChange,
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <h2 className="text-lg font-semibold mb-4 dark:text-white">Select Comparison Type</h2>
      <div className="flex gap-4">
        <button
          onClick={() => onComparisonTypeChange('SBOM')}
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
          onClick={() => onComparisonTypeChange('CVE')}
          disabled
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
        >
          <Shield size={20} />
          CVE Comparison (Coming Soon)
        </button>
      </div>
    </motion.div>
  );
};
