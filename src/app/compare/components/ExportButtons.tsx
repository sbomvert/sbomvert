import React from 'react';
import { FileJson, Download } from 'lucide-react';
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

  const handleDownload = (toolName: string) => {
    try {
      // Get the image name from comparison
      const imageName = comparison.imageId;

      // Format the image name for API calls (this mimics what sbomLoader does)
      const formatContainerName = (folderName: string): string => {
        return folderName.replace(/-?twodots/g, ':').replace(/-?slash/g, '/');
      };

      const reformatName = formatContainerName(imageName);

      // Find the tool format to determine file extension
      const tool = comparison.tools.find(t => t.name === toolName);
      const fileExtension = tool?.format === 'CycloneDX' ? 'cyclonedx' : 'spdx';

      // Construct the download URL
      const downloadUrl = `/api/sbom/${reformatName}/${toolName}.${fileExtension}`;

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
      {comparison.tools.map(tool => (
        <Button
          key={tool.name}
          onClick={() => handleDownload(tool.name)}
          size="Sm"
          variant="outline"
        >
          <Download size={18} />
          Download {tool.name}
        </Button>
      ))}
    </>
  );
};
