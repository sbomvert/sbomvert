'use client';

import React, { useState } from 'react';
import { Button } from '@/components/button/Button';
import { Input } from '@/components/input/Input';
import { Card } from '@/components/card/Card';
import { CardHeader } from '@/components/card/CardHeader';
import { CardTitle } from '@/components/card/CardTitle';
import { CardContent } from '@/components/card/CardContent';
import { FileUp } from 'lucide-react';

interface SbomUploadFormProps {
  title?: string;
  submitText?: string;
  onUpload: (name: string, containerName: string, file: File) => void;
  onCancel?: () => void;
}

export const SbomUploadForm: React.FC<SbomUploadFormProps> = ({ title = 'Upload SBOM File', submitText = 'Upload SBOM', onUpload, onCancel }) => {
  const [name, setName] = useState('');
  const [containerName, setContainerName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !containerName) {
      alert('Please fill all fields and select a file');
      return;
    }
    let fileToUpload = file;
    if (!fileToUpload) {
      const input = document.getElementById('file-input') as HTMLInputElement | null;
      if (input?.files?.[0]) fileToUpload = input.files[0];
    }
    if (!fileToUpload) {
      alert('Please fill all fields and select a file');
      return;
    }
    setIsSubmitting(true);
    try {
      onUpload(name, containerName, fileToUpload);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload SBOM file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const labelClass = 'block text-body-sm font-medium text-foreground-muted mb-1';

  return (
    <Card >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp size={20} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="ml-2">
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

          <div className="ml-2">
            <label htmlFor="containerName" className={labelClass}>Container Name</label>
            <Input
              id="containerName"
              type="text"
              value={containerName}
              onChange={e => setContainerName(e.target.value)}
              required
              placeholder="Enter the container name"
            />
          </div>

          <div className="ml-2">
            <label htmlFor="file-input" className={labelClass}>SBOM File (JSON)</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size='Sm'
                variant="outline"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                Choose File
              </Button>
              <input
                id="file-input"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                required
                className="hidden"
              />
              {file && (
                <span className="text-body-sm text-foreground-muted truncate max-w-xs">
                  {file.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" size='Sm' variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Loading…' : submitText}
            </Button>
            <Button type="button" size='Sm' variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
