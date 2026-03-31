'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const BackButton: React.FC = () => {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-body-sm text-foreground-subtle hover:text-foreground mb-4 transition-colors"
    >
      <ArrowLeft size={14} /> Back
    </button>
  );
};
