'use client';
import React, { useState } from 'react';
import { Button } from '@/components/button/Button';
import { SupportedTools, SupportedToolsType, ToolConfig } from '@/lib/sbom/tools';

type ImageScanFormProps = {
  onSubmit: (image: string, tools: { producers: string[]; consumers: string[] }) => Promise<void> | void;
  onCancel: () => void;
};

export const ImageScanForm: React.FC<ImageScanFormProps> = ({ onSubmit, onCancel }) => {
  const [image, setImage]               = useState('');
  const [selectedTools, setSelectedTools] = useState<SupportedToolsType>(SupportedTools);
  const [submitting, setSubmitting]     = useState(false);

  const toggleProducerTool = (tool: ToolConfig) =>
    setSelectedTools(prev => ({
      ...prev,
      producers: prev.producers.includes(tool)
        ? prev.producers.filter(t => t !== tool)
        : [...prev.producers, tool],
    }));

  const toggleConsumerTool = (tool: ToolConfig) =>
    setSelectedTools(prev => ({
      ...prev,
      consumers: prev.consumers.includes(tool)
        ? prev.consumers.filter(t => t !== tool)
        : [...prev.consumers, tool],
    }));

  const handleSubmit = async () => {
    if (!image.trim()) return alert('Please enter an image name');
    try {
      setSubmitting(true);
      await onSubmit(image, {
        consumers: selectedTools.consumers.map(c => c.name),
        producers: selectedTools.producers.map(p => p.name),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sectionLabel = 'text-body-sm font-medium text-foreground mb-2';

  return (
    <div className="p-6 border border-border rounded-card-lg shadow-card bg-surface text-foreground max-w-md mx-auto mb-6 transition-all animate-in fade-in slide-in-from-top-4">
      <h2 className="text-heading font-semibold mb-4">Scan Container Image</h2>

      <input
        type="text"
        placeholder="repo/app:tag"
        className="w-full border border-border p-2 mb-4 rounded-input bg-input text-foreground focus:ring-2 focus:ring-ring focus:outline-none placeholder:text-foreground-subtle"
        value={image}
        onChange={e => setImage(e.target.value)}
      />

      <div className="mb-4 space-y-3">
        <div>
          <div className={sectionLabel}>SBOM generators:</div>
          <div className="flex flex-wrap gap-2">
            {SupportedTools.producers.map(tool => (
              <Button
                key={tool.name}
                type="button"
                onClick={() => toggleProducerTool(tool)}
                variant={selectedTools.producers.some(t => t.name === tool.name) ? 'primary' : 'secondary'}
                size="sm"
              >
                {tool.name.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className={sectionLabel}>CVE scanners:</div>
          <div className="flex flex-wrap gap-2">
            {SupportedTools.consumers.map(tool => (
              <Button
                key={tool.name}
                type="button"
                onClick={() => toggleConsumerTool(tool)}
                variant={selectedTools.consumers.some(t => t.name === tool.name) ? 'primary' : 'secondary'}
                size="sm"
              >
                {tool.name.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}    disabled={submitting}>Cancel</Button>
        <Button variant="primary"   size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Starting…' : 'Start Scan'}
        </Button>
      </div>
    </div>
  );
};
