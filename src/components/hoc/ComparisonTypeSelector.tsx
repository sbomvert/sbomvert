import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield } from 'lucide-react';
import { Button } from '@/components/button/Button';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

type ComparisonType = 'SBOM' | 'CVE';

interface ComparisonTypeSelectorProps {
  comparisonType: ComparisonType;
  onComparisonTypeChange: (type: ComparisonType) => void;
}

export const ComparisonTypeSelector: React.FC<ComparisonTypeSelectorProps> = ({
  onComparisonTypeChange,
  comparisonType,
}) => {
  const handleButtonClick = (type: ComparisonType) => {
    onComparisonTypeChange(type);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <h2 className="text-lg font-semibold mb-4 dark:text-white">Select Comparison Type</h2>
      <div className="flex gap-4">
        <Button
          onClick={() => handleButtonClick('SBOM')}
          size="md"
          variant={comparisonType === 'SBOM' ? 'primary' : 'unfocused'}
        >
          <FileText size={20} />
          SBOM Comparison
        </Button>
        {FEATURE_FLAGS.CVE_MAPPING_ENABLED && (
          <Button
            onClick={() => handleButtonClick('CVE')}
            size="md"
            variant={comparisonType === 'CVE' ? 'primary' : 'unfocused'}
          >
            <Shield size={20} />
            CVE Comparison
          </Button>
        )}
      </div>
    </motion.div>
  );
};
