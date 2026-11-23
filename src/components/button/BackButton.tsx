'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const className =
  'inline-flex items-center gap-1.5 text-body-sm text-foreground-subtle hover:text-foreground mb-4 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// href: a fixed page to go to instead of the previous one in the history; then it is a real link
export const BackButton: React.FC<{ href?: string }> = ({ href }) => {
  const router = useRouter();
  const content = <><ArrowLeft size={14} aria-hidden /> Back</>;
  return href ? (
    <Link href={href} className={className}>{content}</Link>
  ) : (
    <button type="button" onClick={() => router.back()} className={className}>{content}</button>
  );
};
