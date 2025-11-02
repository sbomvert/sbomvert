import { useState, useCallback } from 'react';

interface UseFileUploadReturn {
  file: File | null;
  uploading: boolean;
  error: string | null;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clearFile: () => void;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setUploading(true);
    setError(null);

    // Validate file type
    const validTypes = ['application/json', 'text/xml', 'application/xml'];
    if (!validTypes.includes(uploadedFile.type)) {
      setError('Invalid file type. Please upload JSON or XML files.');
      setUploading(false);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (uploadedFile.size > maxSize) {
      setError('File size too large. Maximum size is 10MB.');
      setUploading(false);
      return;
    }

    setFile(uploadedFile);
    setUploading(false);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return { file, uploading, error, handleFileUpload, clearFile };
};
