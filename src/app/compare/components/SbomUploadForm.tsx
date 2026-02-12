'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/CardHeader';
import { CardTitle } from '@/components/ui/CardTitle';
import { CardContent } from '@/components/ui/CardContent';
import { FileUp } from 'lucide-react';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

interface SbomUploadFormProps {
  onUpload: (name: string, containerName: string, file: File) => void;
  onCancel: () => void;
}

export const SbomUploadForm: React.FC<SbomUploadFormProps> = ({ onUpload, onCancel }) => {
  // If feature flag is disabled, return null
  if (!FEATURE_FLAGS.ENABLE_SBOM_UPLOAD) {
    return null;
  }

  const [name, setName] = useState('');
  const [containerName, setContainerName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !containerName || !file) {
      alert('Please fill all fields and select a file');
      return;
    }

    setIsSubmitting(true);
    try {
      onUpload(name, containerName, file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload SBOM file');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp size={20} />
          Upload SBOM File
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="ml-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              SBOM Name
            </label>
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
            <label
              htmlFor="containerName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Container Name
            </label>
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
            <label
              htmlFor="file"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              SBOM File (JSON)
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
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
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                  {file.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading...' : 'Upload SBOM'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
