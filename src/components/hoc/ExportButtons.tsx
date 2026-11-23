import React, { useState } from 'react';
import { IMultiToolComparison } from '@/models/IComparisonResult';
import { Selector } from '@/components/select/Selector';
import { SanitizeContainerImage } from '@sbomvert/scan/image';

interface ExportButtonsProps {
  comparison: IMultiToolComparison;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ comparison }) => {
  const [error, setError] = useState('');

  const handleDownload = (toolName: string) => {
    setError('');
    try {
      // Get the image name from comparison
      const imageName = comparison.imageId;

      // Sanitize container name for API URL: replace slashes and colons with placeholders
      const sanitizedContainer = encodeURIComponent(SanitizeContainerImage(imageName));

      // Find the tool format to determine file extension
      const tool = comparison.tools.find(t => t.name === toolName);
      const fileExtension = tool?.format === 'CycloneDX' ? 'cyclonedx.json' : 'spdx.json';

      // Sanitize tool name: replace slashes and uppercase
      // (the displayed name is "Tool (FORMAT)"; the file is named after the tool alone)
      const sanitizedTool = encodeURIComponent(
        toolName.replace(` (${tool?.format})`, '').replace(/[\\/]/g, '-').toLowerCase()
      );

      
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
      setError(`Could not download the ${toolName} SBOM file`);
    }
  };

  return (
    <>
      {/*<Button onClick={() => handleExport('json')} size="sm">
        <FileJson size={18} />
        Export JSON
      </Button>*/}
      <Selector
        size="Sm"
        aria-label="Download SBOM"
        placeholder="Download SBOM"
        options={comparison.tools.map(tool => ({ value: tool.name, label: tool.name }))}
        onValueChange={handleDownload}
      />
      {error && <p role="alert" className="text-body-sm text-error-fg">{error}</p>}
    </>
  );
};
