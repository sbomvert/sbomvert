import React, { useState } from 'react';
import { FileJson, Download } from 'lucide-react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { Button } from '@/components/ui/Button';

interface ExportButtonsProps {
  comparison: IMultiToolComparison;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ comparison }) => {
  const [selectedTool, setSelectedTool] = useState<string>('');

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

  const handleDownload = (toolName: string) => {
    try {
      // Get the image name from comparison
      const imageName = comparison.imageId;

      // Sanitize container name for API URL: replace slashes and colons with placeholders
      const sanitizedContainer = imageName.replace(/\//g, 'slash').replace(/:/g, 'twodots');

      // Find the tool format to determine file extension
      const tool = comparison.tools.find(t => t.name === toolName);
      const fileExtension = tool?.format === 'CycloneDX' ? 'cyclonedx.json' : 'spdx.json';

      // Sanitize tool name: replace slashes and uppercase
      const sanitizedTool = toolName.replace(/[\\/]/g, '-').toLowerCase();

      // Construct the download URL
      const downloadUrl = `/api/sbom/${sanitizedContainer}/${sanitizedTool}.${fileExtension}`;

      // Open the download in a new tab
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download ${toolName} SBOM file`);
    }
  };

  return (
    <>
      <Button onClick={() => handleExport('json')} size="Sm">
        <FileJson size={18} />
        Export JSON
      </Button>
      {/* Add download buttons for each tool */}
      <div className="flex items-center space-x-2">
        <select
          value={selectedTool}
          onChange={e => {
            const val = e.target.value;
            setSelectedTool(val);
            if (val) {
              handleDownload(val);
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded font-medium transition-all bg-primary text-white hover:bg-primary/90 px-4 py-2"
        >
          <option value="" disabled>Download SBOM</option>
          {comparison.tools.map(tool => (
            <option key={tool.name} value={tool.name}>
              {tool.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};
