'use client';
import React, { useState } from 'react';
import { Check, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/button/Button';
import {
  producesFormat,
  SBOM_FORMATS,
  SbomFormat,
  SupportedTools,
  SupportedToolsType,
  ToolConfig,
} from '@sbomvert/scan/tools';

const FORMAT_LABELS: Record<SbomFormat, string> = { spdx: 'SPDX', cdx: 'CycloneDX' };

// how the tools call themselves; the ids in tools.ts are what the API takes
const TOOL_LABELS: Record<string, string> = {
  trivy: 'Trivy',
  syft: 'Syft',
  scout: 'Docker Scout',
  amazon: 'Amazon Inspector',
  osv: 'OSV-Scanner',
  cdxgen: 'cdxgen',
  grype: 'Grype',
};
const toolLabel = (name: string) => TOOL_LABELS[name] ?? name;

// what the form starts with: every tool, except those marked unselected_by_default
const defaultTools = (): SupportedToolsType => ({
  producers: SupportedTools.producers.filter(t => !t.unselected_by_default),
  consumers: SupportedTools.consumers.filter(t => !t.unselected_by_default),
});

type ImageScanFormProps = {
  onSubmit: (
    image: string,
    tools: { producers: string[]; consumers: string[] },
    formats: SbomFormat[]
  ) => Promise<void> | void; // throws to report that the scan could not start
  onCancel?: () => void;
};

// a toggle that reads as a checkbox: the check, not a fill colour, says it is on
const Toggle: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-button border text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      on
        ? 'border-border-field bg-surface text-foreground'
        : 'border-border bg-transparent text-foreground-subtle hover:text-foreground hover:bg-muted'
    }`}
  >
    <Check size={14} strokeWidth={2} className={on ? 'text-primary-fg' : 'opacity-0'} aria-hidden />
    {children}
  </button>
);

export const ImageScanForm: React.FC<ImageScanFormProps> = ({ onSubmit, onCancel }) => {
  const [image, setImage]               = useState('');
  const [selectedTools, setSelectedTools] = useState<SupportedToolsType>(defaultTools);
  const [formats, setFormats]           = useState<SbomFormat[]>([...SBOM_FORMATS]);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');

  const toggleFormat = (format: SbomFormat) =>
    setFormats(prev => (prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]));

  const toggleTool = (kind: 'producers' | 'consumers', tool: ToolConfig) =>
    setSelectedTools(prev => ({
      ...prev,
      [kind]: prev[kind].includes(tool) ? prev[kind].filter(t => t !== tool) : [...prev[kind], tool],
    }));

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!image.trim()) return setError('Enter an image name, e.g. alpine:3.24');
    if (formats.length === 0) return setError('Select at least one SBOM format');
    setError('');
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
    } catch (err) {
      setError(`The scan could not start: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // the selected generators that cannot write a selected format: that SBOM will not be made
  const cannot = selectedTools.producers.flatMap(tool =>
    formats.filter(f => !producesFormat(tool, f)).map(f => `${toolLabel(tool.name)} cannot write ${FORMAT_LABELS[f]}, so that SBOM is skipped`)
  );

  const groupLabel = 'text-body-sm font-medium text-foreground-muted mb-2';

  return (
    <section className="mb-6 bg-surface border border-border rounded-card shadow-card">
      <form onSubmit={handleSubmit} noValidate>
        <div className="p-card-p-lg">
          <label htmlFor="scan-image" className={`block ${groupLabel}`}>Image</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="scan-image"
              type="text"
              placeholder="repo/app:tag"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 h-10 rounded-input border border-border-field px-3 font-mono text-body-sm bg-surface text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-ring"
              value={image}
              onChange={e => setImage(e.target.value)}
            />
            <div className="flex gap-2">
              {onCancel && (
                <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting} withHover>Cancel</Button>
              )}
              <Button type="submit" variant="primary" disabled={submitting} withHover className="w-full sm:w-auto">
                {submitting ? 'Starting…' : 'Start scan'}
              </Button>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-body-sm text-error-fg">{error}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-10 border-t border-border p-card-p-lg">
          <fieldset>
            <legend className={groupLabel}>SBOM generators</legend>
            <div className="flex flex-wrap gap-2">
              {SupportedTools.producers.map(tool => (
                <Toggle key={tool.name} on={selectedTools.producers.includes(tool)} onClick={() => toggleTool('producers', tool)}>
                  {toolLabel(tool.name)}
                </Toggle>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={groupLabel}>SBOM formats</legend>
            <div className="flex flex-wrap gap-2">
              {SBOM_FORMATS.map(format => (
                <Toggle key={format} on={formats.includes(format)} onClick={() => toggleFormat(format)}>
                  {FORMAT_LABELS[format]}
                </Toggle>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={groupLabel}>CVE scanners (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {SupportedTools.consumers.map(tool => (
                <Toggle key={tool.name} on={selectedTools.consumers.includes(tool)} onClick={() => toggleTool('consumers', tool)}>
                  {toolLabel(tool.name)}
                </Toggle>
              ))}
            </div>
          </fieldset>
        </div>

        {cannot.length > 0 && (
          <ul role="status" className="border-t border-border px-card-p-lg py-3 space-y-1 text-caption text-foreground-muted">
            {cannot.map(message => (
              <li key={message} className="flex items-center gap-2">
                <TriangleAlert size={14} className="shrink-0 text-warning-fg" aria-hidden />
                {message}
              </li>
            ))}
          </ul>
        )}
      </form>
    </section>
  );
};
