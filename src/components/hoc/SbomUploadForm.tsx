'use client';

import React, { useState } from 'react';
import { Button } from '@/components/button/Button';
import { Input } from '@/components/input/Input';
import { Card } from '@/components/card/Card';
import { CardTitle } from '@/components/card/CardTitle';
import { FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilePicker } from '@/components/input/FilePicker';
import { labelClass } from '@/components/input/fieldStyles';

interface SbomUploadFormProps {
  // a heading inside the card, for when the page has none (e.g. in a dialog)
  title?: string;
  submitText?: string;
  // throws to report a failed upload
  onUpload: (name: string, containerName: string, file: File) => void | Promise<void>;
  onCancel?: () => void;
  // the card's classes: e.g. no card look inside a dialog
  className?: string;
}


export const SbomUploadForm: React.FC<SbomUploadFormProps> = ({ title, submitText = 'Upload SBOM', onUpload, onCancel, className }) => {
  const [name, setName] = useState('');
  const [containerName, setContainerName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploaded('');
    if (!name || !containerName || !file) {
      setError('Fill in every field and choose a file');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onUpload(name, containerName, file);
      setUploaded(`SBOM "${name}" uploaded`);
      // a second submit must not upload the same SBOM again
      setName('');
      setContainerName('');
      setFile(null);
    } catch (err) {
      setError(`Failed to upload the SBOM: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn('max-w-2xl', className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {title && (
          <CardTitle className="flex items-center gap-2">
            <FileUp size={20} />
            {title}
          </CardTitle>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>SBOM Name</label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Enter a name for this SBOM"
            />
          </div>

          <div>
            <label htmlFor="containerName" className={labelClass}>Container Name</label>
            <Input
              id="containerName"
              type="text"
              value={containerName}
              onChange={e => setContainerName(e.target.value)}
              required
              placeholder="e.g. alpine:3.24"
            />
          </div>
        </div>

        <div>
          <label htmlFor="file-input" className={labelClass}>SBOM File (JSON)</label>
          <FilePicker id="file-input" fileName={file?.name} onFile={f => setFile(f ?? null)} />
        </div>

        {error && (
          <p role="alert" className="text-body-sm rounded-input border border-danger px-3 py-2 text-danger">
            {error}
          </p>
        )}
        {uploaded && (
          <p role="status" className="text-body-sm rounded-input border border-success px-3 py-2 text-success-fg">
            {uploaded}
          </p>
        )}

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" size="sm" variant="outline-solid" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Uploading…' : submitText}
          </Button>
        </div>
      </form>
    </Card>
  );
};
