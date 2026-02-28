import React, { useState } from 'react';
import { FileJson, Download } from 'lucide-react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { Button } from '@/components/button/Button';
import { Selector } from '@/components/select/Selector';

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

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = ''; // Optionally specify a filename here

      // Append to the body to make it work in Firefox
      document.body.appendChild(link);

      // Trigger click
      link.click();

      // Remove the link after triggering
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download ${toolName} SBOM file`);
    }
  };

  return (
    <>
      {/*<Button onClick={() => handleExport('json')} size="sm">
        <FileJson size={18} />
        Export JSON
      </Button>*/}
      <Selector
        size="md"
        defaultValue=""
        onChange={(e) => {
          const val = e.target.value;
          setSelectedTool(val);
          if (val) {
            handleDownload(val);
          }
        }}
      >
        <option value="" disabled>
          Download SBOM
        </option>

        {comparison.tools.map((tool) => (
          <option key={tool.name} value={tool.name}>
            {tool.name}
          </option>
        ))}
      </Selector>
    </>
  );
};
