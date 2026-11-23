import React from 'react';
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
}) => (
  <div className="mb-section">
    <h2 className="text-body-sm font-medium text-foreground-muted mb-2">Comparison type</h2>
    <div className="flex gap-2">
      <Button
        onClick={() => onComparisonTypeChange('SBOM')}
        size="md"
        variant={comparisonType === 'SBOM' ? 'primary' : 'unfocused'}
      >
        <FileText size={16} />
        SBOM Comparison
      </Button>
      {FEATURE_FLAGS.CVE_MAPPING_ENABLED && (
        <Button
          onClick={() => onComparisonTypeChange('CVE')}
          size="md"
          variant={comparisonType === 'CVE' ? 'primary' : 'unfocused'}
        >
          <Shield size={16} />
          CVE Comparison
        </Button>
      )}
    </div>
  </div>
);
