'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// href: a fixed page to go to instead of the previous one in the history
export const BackButton: React.FC<{ href?: string }> = ({ href }) => {
  const router = useRouter();
  return (
    <button
      onClick={() => (href ? router.push(href) : router.back())}
      className="inline-flex items-center gap-1.5 text-body-sm text-foreground-subtle hover:text-foreground mb-4 transition-colors"
    >
      <ArrowLeft size={14} /> Back
    </button>
  );
};
