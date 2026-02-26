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
  const [name, setName] = useState('');
  const [containerName, setContainerName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If feature flag is disabled, return null
  if (!FEATURE_FLAGS.ENABLE_SBOM_UPLOAD) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !containerName) {
      alert('Please fill all fields and select a file');
      return;
    }

    let fileToUpload = file;
    if (!fileToUpload) {
      const input = document.getElementById('file-input') as HTMLInputElement | null;
      if (input && input.files && input.files[0]) {
        fileToUpload = input.files[0];
      }
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
              htmlFor="file-input"
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
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded font-medium transition-all bg-primary text-white focus:ring-indigo-500 shadow-lg px-6 py-3 text-base"
            >
              {isSubmitting ? 'Uploading...' : 'Upload SBOM'}
            </button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
