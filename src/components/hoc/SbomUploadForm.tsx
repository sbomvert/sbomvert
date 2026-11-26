'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/button/Button';
import { Input } from '@/components/input/Input';
import { List } from '@/components/list/List';
import { searchStoredImages } from '@/lib/sbomLoader';
import { CardTitle } from '@/components/card/CardTitle';
import { Check, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilePicker } from '@/components/input/FilePicker';
import { SegmentedRadio } from '@/components/input/SegmentedRadio';
import { fieldClass, labelClass } from '@/components/input/fieldStyles';
import { formatOf, SbomFormat } from '@sbomvert/core/translate/detectTool';
import { parseCreator } from '@/lib/sbom/spdx/parser';
import { getTool } from '@/lib/sbom/cyclonedx/parser';

// What the SBOM says about itself: the tool is the user's to correct
export interface SbomDetails {
  format: SbomFormat;
  tool: string;
  vendor?: string;
}

type Detected = { format: SbomFormat; formatLabel: string; tool: string; vendor?: string } | { error: string };

// read when the SBOM is pasted or chosen, so the form can show it before the upload
export const detectSbom = (text: string): Detected => {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return { error: 'Not valid JSON' };
  }
  const format = formatOf(doc);
  if (format === 'spdx') {
    const { tool, vendor } = parseCreator(doc.creationInfo?.creators ?? []);
    return { format, formatLabel: doc.spdxVersion.replace('SPDX-', 'SPDX '), tool, vendor: vendor || undefined };
  }
  if (format === 'cdx') {
    const { name, vendor } = getTool(doc, '');
    return { format, formatLabel: `CycloneDX ${doc.specVersion ?? ''}`.trim(), tool: name === 'Unknown' ? '' : name, vendor };
  }
  return { error: 'Not an SPDX or CycloneDX SBOM' };
};

interface SbomUploadFormProps {
  // a heading inside the card, for when the page has none (e.g. in a dialog)
  title?: string;
  submitText?: string;
  // throws to report a failed upload
  onUpload: (containerName: string, file: File, details: SbomDetails) => void | Promise<void>;
  onCancel?: () => void;
  // the card's classes: e.g. no card look inside a dialog
  className?: string;
  // offer pasting the SBOM's JSON as well as choosing a file (pasted first)
  allowPaste?: boolean;
  // ask for the container name; without it onUpload gets an empty string
  askContainer?: boolean;
}


export const SbomUploadForm: React.FC<SbomUploadFormProps> = ({ title, submitText = 'Upload SBOM', onUpload, onCancel, className, allowPaste = false, askContainer = true }) => {
  const [containerName, setContainerName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<'paste' | 'file'>(allowPaste ? 'paste' : 'file');
  const [pasted, setPasted] = useState('');
  const [fileText, setFileText] = useState('');
  const [tool, setTool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState('');
  const [matches, setMatches] = useState<string[]>([]);

  const text = source === 'paste' ? pasted : fileText;
  const detected = text.trim() ? detectSbom(text) : undefined;

  // a new SBOM brings its own tool; an edit of the field lasts until then
  const sbomChanged = (next: string) => {
    const d = next.trim() ? detectSbom(next) : undefined;
    setTool(d && 'tool' in d ? d.tool : '');
  };
  const onPaste = (next: string) => {
    setPasted(next);
    sbomChanged(next);
  };
  const onFile = async (f?: File) => {
    setFile(f ?? null);
    const next = f ? await f.text() : '';
    setFileText(next);
    sbomChanged(next);
  };
  const switchSource = (next: 'paste' | 'file') => {
    setSource(next);
    sbomChanged(next === 'paste' ? pasted : fileText);
  };

  // stored containers that match the typed name, as a lookup: the name itself stays free
  useEffect(() => {
    if (!askContainer || !containerName.trim()) return;
    let current = true;
    const timer = setTimeout(() => {
      searchStoredImages(containerName.trim()).then(list => {
        if (current) setMatches(list);
      });
    }, 350);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [askContainer, containerName]);
  // nothing is suggested for an empty name, nor for a container already picked (or typed exactly)
  const options = askContainer && containerName.trim()
    ? matches.filter(match => match !== containerName.trim())
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploaded('');
    // pasted JSON goes to onUpload as a file, like a chosen one
    const sbom = source === 'paste'
      ? (pasted.trim() ? new File([pasted], 'pasted.json', { type: 'application/json' }) : null)
      : file;
    if ((askContainer && !containerName.trim()) || !sbom) {
      const what = source === 'paste' ? 'Paste the SBOM' : 'Choose a file';
      setError(askContainer && !containerName.trim() ? 'Enter the container name' : what);
      return;
    }
    if (!detected || 'error' in detected) {
      setError(detected?.error ?? 'Not an SPDX or CycloneDX SBOM');
      return;
    }
    if (!tool.trim()) {
      setError('Enter the tool that made the SBOM');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onUpload(containerName.trim(), sbom, { format: detected.format, tool: tool.trim(), vendor: detected.vendor });
      setUploaded(askContainer ? 'SBOM uploaded' : 'SBOM loaded');
      // a second submit must not upload the same SBOM again
      setContainerName('');
      setFile(null);
      setFileText('');
      setPasted('');
      setTool('');
    } catch (err) {
      setError(`Failed to upload the SBOM: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // p-6, not the card token: a caller's p-0 (e.g. inside a dialog) must be able to override it
    <section className={cn('bg-surface border border-border rounded-card shadow-card p-6', className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {title && (
          <CardTitle className="flex items-center gap-2">
            <FileUp size={18} className="text-foreground-subtle" aria-hidden />
            {title}
          </CardTitle>
        )}

        {askContainer && (
          <div className="relative">
            <label htmlFor="containerName" className={labelClass}>Container name</label>
            <Input
              id="containerName"
              type="text"
              value={containerName}
              onChange={e => setContainerName(e.target.value)}
              required
              placeholder="e.g. alpine:3.24"
              className="font-mono"
            />
            {options.length > 0 && (
              <div className="absolute z-50 mt-2 w-full bg-surface border border-border rounded-card-lg shadow-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <List
                    items={options}
                    getId={name => name}
                    getLabel={name => name}
                    labelClassName="font-mono"
                    onSelect={name => setContainerName(name)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {allowPaste && (
          <SegmentedRadio
            name="sbom-source"
            legend="Source"
            hideLegend
            value={source}
            onChange={switchSource}
            options={[{ value: 'paste', label: 'Paste JSON' }, { value: 'file', label: 'File from my computer' }]}
          />
        )}

        {source === 'paste' ? (
          <div>
            <label htmlFor="sbom-json" className={labelClass}>SBOM (JSON)</label>
            <textarea
              id="sbom-json"
              spellCheck={false}
              className={cn(fieldClass, 'h-64 font-mono text-caption')}
              value={pasted}
              onChange={e => onPaste(e.target.value)}
              placeholder="Paste an SPDX or CycloneDX JSON SBOM"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="file-input" className={labelClass}>SBOM file</label>
            <FilePicker id="file-input" fileName={file?.name} onFile={onFile} />
          </div>
        )}

        {detected && 'error' in detected && (
          <p className="text-body-sm text-error-fg">{detected.error}</p>
        )}
        {detected && 'format' in detected && (
          // what the SBOM says about itself, as a read-out; only the tool can be corrected
          <dl className="grid gap-4 sm:grid-cols-3 rounded-input bg-surface-alt border border-border p-4">
            <div>
              <dt className={labelClass}>Format</dt>
              <dd className="font-mono text-body-sm text-foreground py-2">{detected.formatLabel}</dd>
            </div>
            <div>
              <dt><label htmlFor="sbom-tool" className={labelClass}>Tool</label></dt>
              <dd>
                <Input id="sbom-tool" type="text" value={tool} onChange={e => setTool(e.target.value)} placeholder="e.g. syft" />
                <p className="text-caption text-foreground-muted mt-1">
                  {!detected.tool ? 'Not detected: enter it' : tool === detected.tool ? 'Detected' : `Detected: ${detected.tool}`}
                </p>
              </dd>
            </div>
            <div>
              <dt className={labelClass}>Vendor</dt>
              <dd className="text-body-sm text-foreground py-2">{detected.vendor || 'Not stated'}</dd>
            </div>
          </dl>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border">
          {error && (
            <p role="alert" className="mr-auto text-body-sm text-error-fg">{error}</p>
          )}
          {uploaded && (
            <p role="status" className="mr-auto inline-flex items-center gap-2 text-body-sm text-success-fg">
              <Check size={16} aria-hidden />
              {uploaded}
            </p>
          )}
          {onCancel && (
            <Button type="button" variant="secondary" withHover onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" withHover disabled={isSubmitting}>
            {isSubmitting ? 'Uploading…' : submitText}
          </Button>
        </div>
      </form>
    </section>
  );
};
