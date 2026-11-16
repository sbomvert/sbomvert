'use client';
import React, { useState } from 'react';
import { Button } from '@/components/button/Button';
import { Card } from '@/components/card/Card';
import {
  producesFormat,
  SBOM_FORMATS,
  SbomFormat,
  SupportedTools,
  SupportedToolsType,
  ToolConfig,
} from '@sbomvert/scan/tools';

const FORMAT_LABELS: Record<SbomFormat, string> = { spdx: 'SPDX', cdx: 'CycloneDX' };

type ImageScanFormProps = {
  onSubmit: (
    image: string,
    tools: { producers: string[]; consumers: string[] },
    formats: SbomFormat[]
  ) => Promise<void> | void;
  onCancel: () => void;
};

export const ImageScanForm: React.FC<ImageScanFormProps> = ({ onSubmit, onCancel }) => {
  const [image, setImage]               = useState('');
  const [selectedTools, setSelectedTools] = useState<SupportedToolsType>(SupportedTools);
  const [formats, setFormats]           = useState<SbomFormat[]>([...SBOM_FORMATS]);
  const [submitting, setSubmitting]     = useState(false);

  const toggleFormat = (format: SbomFormat) =>
    setFormats(prev => (prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]));

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
    if (formats.length === 0) return alert('Please select at least one SBOM format');
    try {
      setSubmitting(true);
      await onSubmit(
        image,
        {
          consumers: selectedTools.consumers.map(c => c.name),
          producers: selectedTools.producers.map(p => p.name),
        },
        formats
      );
    } finally {
      setSubmitting(false);
    }
  };

  // the selected generators that cannot write a selected format: that SBOM will not be made
  const cannot = selectedTools.producers.flatMap(tool =>
    formats.filter(f => !producesFormat(tool, f)).map(f => `${tool.name.toUpperCase()} cannot generate ${FORMAT_LABELS[f]} SBOMs`)
  );

  // the translate page's look
  const sectionLabel = 'block text-body-sm font-medium text-foreground-muted mb-1';

  return (
    <Card className="flex flex-col gap-5 max-w-2xl mb-6">
      <div>
        <label htmlFor="scan-image" className={sectionLabel}>Image</label>
        <input
          id="scan-image"
          type="text"
          placeholder="repo/app:tag"
          className="w-full rounded-input border border-border px-3 py-2 text-body-sm bg-surface text-foreground placeholder:text-foreground-subtle"
          value={image}
          onChange={e => setImage(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div>
          <div className={sectionLabel}>SBOM generators</div>
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
          <div className={sectionLabel}>SBOM formats</div>
          <div className="flex flex-wrap gap-2">
            {SBOM_FORMATS.map(format => (
              <Button
                key={format}
                type="button"
                onClick={() => toggleFormat(format)}
                variant={formats.includes(format) ? 'primary' : 'secondary'}
                size="sm"
              >
                {FORMAT_LABELS[format]}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className={sectionLabel}>CVE scanners</div>
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

      {cannot.length > 0 && (
        <div role="status" className="p-3 rounded-input border border-warning bg-warning-subtle text-warning-fg text-body-sm">
          {cannot.map(message => (
            <p key={message}>{message}: none will be made.</p>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}    disabled={submitting}>Cancel</Button>
        <Button variant="primary"   size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Starting…' : 'Start Scan'}
        </Button>
      </div>
    </Card>
  );
};
