'use client';

import { useSbomStore } from '@/store/useSbomStore';
import AnalyzeDetailClient from '../[image]/[sbom]/AnalyzeDetailClient';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyzeLocalWrapper() {
  const { info, packages, name, containerName } = useSbomStore();
  const router = useRouter();

  // Guard: prevent empty access
  useEffect(() => {
    if (!info || packages.length === 0) {
      router.replace('/analyze');
    }
  }, [info, packages, router]);

  if (!info) return null;

  return (
    <AnalyzeDetailClient
      imageName={containerName || "Local SBOM"}
      toolFile={name || "uploaded.json"}
      info={info}
      packages={packages}
    />
  );
}