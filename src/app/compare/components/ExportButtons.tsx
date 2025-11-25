import React from 'react';
import { FileJson } from 'lucide-react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { Button } from '@/components/ui/Button';

interface ExportButtonsProps {
  comparison: IMultiToolComparison;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ comparison }) => {
  const handleExport = (format: 'pdf' | 'json') => {
    if (format === 'json') {
      const exportData = {
        imageId: comparison.imageId,
        tools: comparison.tools,
        statistics: comparison.statistics,
        packages: Array.from(comparison.allPackages.entries()).map(([key, value]) => ({
          key,
          name: value.name,
          version: value.version,
          packageType: value.packageType,
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
      alert(
        'PDF export would use libraries like jsPDF or react-pdf to generate a formatted report'
      );
    }
  };

  return (
    <>
      <Button
        onClick={() => handleExport('json')}
        size='Sm'
      >
        <FileJson size={18} />
        Export JSON
      </Button>
      {/*  <button
        onClick={() => handleExport('pdf')}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Download size={18} />
        Export PDF
      </button>
*/}
    </>
  );
};
