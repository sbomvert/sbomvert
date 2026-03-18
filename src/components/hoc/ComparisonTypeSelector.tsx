import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield } from 'lucide-react';
import { Button } from '@/components/button/Button';
import { useRouter } from 'next/navigation';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

type ComparisonType = 'SBOM' | 'CVE';

interface ComparisonTypeSelectorProps {
  comparisonType: ComparisonType;
  onComparisonTypeChange: (type: ComparisonType) => void;
}

export const ComparisonTypeSelector: React.FC<ComparisonTypeSelectorProps> = ({
  onComparisonTypeChange,
}) => {
  const router = useRouter();
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <h2 className="text-lg font-semibold mb-4 dark:text-white">Select Comparison Type</h2>
      <div className="flex gap-4">
        <Button onClick={() => onComparisonTypeChange('SBOM')} size="md">
          <FileText size={20} />
          SBOM Comparison
        </Button>
        {FEATURE_FLAGS.CVE_MAPPING_ENABLED && (
          <Button onClick={() => { router.push('/compare/cve'); }} size="md">
            <Shield size={20} />
            CVE Comparison
          </Button>
        )}
      </div>
    </motion.div>
  );
};
