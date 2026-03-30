'use client';

import { SbomUploadForm } from "@/components/hoc/SbomUploadForm";


export default function UploadPage() {
  const handleUpload = async (name: string, containerName: string, file: File) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('containerName', containerName);
    formData.append('file', file);

    try {
      const response = await fetch('/api/sbom/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok)
        throw new Error((await response.json()).error || 'Upload failed');

      alert(`SBOM "${name}" uploaded successfully`);
    } catch (error) {
      alert(`Failed to upload SBOM: ${(error as Error).message}`);
    } 
  };

  return (
  <SbomUploadForm onUpload={handleUpload} />)
}