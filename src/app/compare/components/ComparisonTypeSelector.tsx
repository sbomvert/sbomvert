import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ComparisonType = 'SBOM' | 'CVE';

interface ComparisonTypeSelectorProps {
  comparisonType: ComparisonType;
  onComparisonTypeChange: (type: ComparisonType) => void;
}

export const ComparisonTypeSelector: React.FC<ComparisonTypeSelectorProps> = ({
  onComparisonTypeChange,
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <h2 className="text-lg font-semibold mb-4 dark:text-white">Select Comparison Type</h2>
      <div className="flex gap-4">
        <Button onClick={() => onComparisonTypeChange('SBOM')} size="md">
          <FileText size={20} />
          SBOM Comparison
        </Button>
        <Button onClick={() => onComparisonTypeChange('CVE')} variant="disabled">
          <Shield size={20} />
          CVE Comparison (Coming Soon)
        </Button>
      </div>
    </motion.div>
  );
};
