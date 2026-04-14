// app/.../page.tsx

import { AnalyzeSPDX } from '@/lib/sbom/spdx/parser';
import { formatContainerName } from '@/lib/container/containerUtils';
import { SpdxDocument } from '@/lib/sbom/spdx/types';
import AnalyzeDetailClient from './AnalyzeDetailClient';

export default async function Page({
  params,
}: {
  params: Promise<{ image: string; sbom: string }>;
}) {
  const { image, sbom } = await params;
  const imageSlug = decodeURIComponent(image ?? '');
  const toolFile = decodeURIComponent(sbom ?? '');
  const imageName = formatContainerName(imageSlug);

  if (!imageSlug || !toolFile) {
    throw new Error('Invalid params');
  }

  // Prefer direct data access instead of calling your own API if possible.
  // If not, this still works:
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/sbom/${imageSlug}/${toolFile}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch SBOM: ${res.status}`);
  }

  const doc: SpdxDocument = await res.json();

  const parsed = AnalyzeSPDX(doc, imageName);

  // Ensure serializable payload
  const safeParsed = JSON.parse(JSON.stringify(parsed));

  return (
    <AnalyzeDetailClient
      imageName={imageName}
      toolFile={toolFile}
      info={safeParsed.info}
      packages={safeParsed.packages}
    />
  );
}