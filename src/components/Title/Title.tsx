import React from 'react';

export interface TitleProps {
  title: string;
  subtitle?: string;
}

export const PageTitle: React.FC<TitleProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-section">
      <h1 className="text-heading-lg text-foreground">{title}</h1>
      {subtitle && (
        <p className="text-body-sm text-foreground-muted mt-1">{subtitle}</p>
      )}
    </div>
  );
};
