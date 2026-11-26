'use client';

import { SbomDetails, SbomUploadForm } from "@/components/hoc/SbomUploadForm";
import { PageTitle } from "@/components/Title/Title";

// the form reports the outcome: a failed upload throws
const handleUpload = async (containerName: string, file: File, details: SbomDetails) => {
  const formData = new FormData();
  formData.append('containerName', containerName);
  formData.append('file', file);
  // stored as <tool>.<format>.json, like the other SBOMs: "Docker Scout" -> docker-scout
  formData.append('tool', details.tool.toLowerCase().replace(/\s+/g, '-'));
  formData.append('format', details.format);

  const response = await fetch('/api/sbom/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok)
    // the body of an error may not be JSON (e.g. a proxy's HTML page)
    throw new Error((await response.json().catch(() => ({}))).error || 'Upload failed');
};

export default function UploadPage() {
  return (
    <>
      <PageTitle title="Upload SBOM" subtitle="Add an SPDX or CycloneDX SBOM of a container image to the stored SBOMs" />
      <SbomUploadForm onUpload={handleUpload} />
    </>
  );
}
