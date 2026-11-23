import React from 'react';

export interface TitleProps {
  title: string;
  subtitle?: string;
  // a small label above the title, e.g. the kind of page
  eyebrow?: string;
  // shown at the right of the title, e.g. a view switch
  children?: React.ReactNode;
}

export const PageTitle: React.FC<TitleProps> = ({ title, subtitle, eyebrow, children }) => {
  return (
    <div className="mb-section flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* tabs, history and screen readers tell pages apart by the document title (React puts it in <head>) */}
      <title>{[title, eyebrow, 'SBOMVert'].filter(Boolean).join(' · ')}</title>
      <div className="min-w-0">
        {eyebrow && <p className="text-label font-medium uppercase tracking-wider text-foreground-subtle mb-1">{eyebrow}</p>}
        <h1 className="text-display text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-body-sm text-foreground-muted mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
};
