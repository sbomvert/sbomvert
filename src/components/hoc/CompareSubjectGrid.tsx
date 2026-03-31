'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Container, GitBranch, Box, Clock, ChevronRight, Package } from 'lucide-react';
import { SubjectMetadata, SubjectType } from '@/services/artifactStorageService/artifactStorageService.types';
import { cn } from '@/lib/utils';

export type CompareMode = 'SBOM' | 'CVE';

export interface CompareSubjectGridProps {
  subjects: SubjectMetadata[];
  mode: CompareMode;
  onSelect: (subject: SubjectMetadata) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs  = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);
  if (diffSec < 60)  return 'just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay < 7)   return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function splitName(name: string): { label: string; prefix: string | null } {
  const parts = name.split('/');
  const label = parts.pop() ?? name;
  return { label, prefix: parts.length > 0 ? parts.join('/') : null };
}

const TYPE_ICON: Record<SubjectType, React.ReactNode> = {
  [SubjectType.Container]:  <Container  size={12} strokeWidth={1.75} />,
  [SubjectType.Repository]: <GitBranch  size={12} strokeWidth={1.75} />,
  [SubjectType.Other]:      <Box        size={12} strokeWidth={1.75} />,
};

// Semantic token classes for subject type badges
const TYPE_STYLE: Record<SubjectType, string> = {
  [SubjectType.Container]:  'bg-info-subtle text-info-fg',
  [SubjectType.Repository]: 'bg-info-subtle text-info-fg',
  [SubjectType.Other]:      'bg-surface-alt text-foreground-muted',
};

function TypeBadge({ type }: { type: SubjectType }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-label font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-badge',
      TYPE_STYLE[type]
    )}>
      {TYPE_ICON[type]}
      {type}
    </span>
  );
}

interface CountPillProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  active: boolean;
  activeClass: string;
}

function CountPill({ icon, count, label, active, activeClass }: CountPillProps) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-panel text-caption font-medium',
      active ? activeClass : 'bg-surface-alt text-foreground-subtle'
    )}>
      {icon}
      <span className="tabular-nums font-bold">{count}</span>
      <span className="font-normal opacity-80">{label}</span>
    </div>
  );
}

interface CompareCardProps {
  subject: SubjectMetadata;
  mode: CompareMode;
  index: number;
  onSelect: (subject: SubjectMetadata) => void;
}

function CompareCard({ subject, mode, index, onSelect }: CompareCardProps) {
  const { label, prefix } = splitName(subject.name ?? subject.id);
  const updatedAt = subject.updatedAt ?? subject.createdAt;

  const canSelectSbom = subject.sboms >= 2;
  const canSelectCve  = subject.cves  >= 1;
  const isSelectable  = mode === 'SBOM' ? canSelectSbom : canSelectCve;

  const disabledReason = !isSelectable
    ? mode === 'SBOM' ? `Need at least 2 SBOMs (has ${subject.sboms})` : 'No CVE reports yet'
    : null;

  // Accent bar colour token based on mode and availability
  const accentBar = mode === 'SBOM'
    ? canSelectSbom ? 'bg-primary'  : 'bg-border'
    : canSelectCve  ? 'bg-success'  : 'bg-border';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      <button
        type="button"
        onClick={isSelectable ? () => onSelect(subject) : undefined}
        disabled={!isSelectable}
        title={disabledReason ?? `Compare ${mode === 'SBOM' ? 'SBOMs' : 'CVE reports'} for ${label}`}
        className={cn(
          'w-full text-left rounded-card-lg border overflow-hidden transition-all duration-150 bg-surface',
          isSelectable
            ? 'border-border-subtle shadow-card hover:shadow-card-hover hover:border-border cursor-pointer group'
            : 'border-border-subtle opacity-50 cursor-not-allowed'
        )}
      >
        {/* Accent bar */}
        <div className={cn('h-0.5 w-full', accentBar)} />

        <div className="p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <TypeBadge type={subject.type} />
              </div>
              {prefix && (
                <p className="text-label text-foreground-subtle truncate leading-none mb-0.5">{prefix}</p>
              )}
              <h3 className="font-semibold text-body-sm text-foreground truncate leading-tight">{label}</h3>
              {subject.description && (
                <p className="text-caption text-foreground-muted mt-0.5 line-clamp-1">{subject.description}</p>
              )}
            </div>
            {isSelectable && (
              <ChevronRight
                size={16}
                className="shrink-0 mt-1 text-foreground-subtle group-hover:text-primary transition-colors"
              />
            )}
          </div>

          {/* Count pills */}
          <div className="flex gap-2">
            <CountPill icon={<FileText size={11} />} count={subject.sboms} label="SBOMs" active={subject.sboms >= 2} activeClass="bg-info-subtle text-info-fg" />
            <CountPill icon={<Shield   size={11} />} count={subject.cves}  label="CVEs"  active={subject.cves  >= 1} activeClass="bg-success-subtle text-success-fg" />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-1.5 text-label text-foreground-subtle">
            {disabledReason ? (
              <span className="text-warning-fg">{disabledReason}</span>
            ) : (
              <>
                <Clock size={10} className="shrink-0" />
                <span>Updated {formatRelativeTime(updatedAt)}</span>
              </>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

export function CompareSubjectGrid({
  subjects, mode, onSelect, currentPage, totalPages, onPageChange,
}: CompareSubjectGridProps) {
  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-card-lg bg-surface-alt flex items-center justify-center mb-4">
          <Package size={24} className="text-foreground-subtle" />
        </div>
        <p className="text-foreground font-medium mb-1">No subjects found</p>
        <p className="text-body-sm text-foreground-muted">Upload an SBOM or CVE report to get started.</p>
      </div>
    );
  }

  const selectable = subjects.filter(s => mode === 'SBOM' ? s.sboms >= 2 : s.cves >= 1).length;
  const modeColour = mode === 'SBOM' ? 'text-primary' : 'text-success';
  const modeLabel  = mode === 'SBOM' ? 'SBOM comparison' : 'CVE comparison';
  const needMore   = mode === 'SBOM' ? 'SBOMs' : 'CVE reports';

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-foreground-muted">
        {selectable} of {subjects.length} subject{subjects.length !== 1 ? 's' : ''} available for{' '}
        <span className={modeColour}>{modeLabel}</span>
        {selectable < subjects.length && (
          <span className="ml-1 text-foreground-subtle">· dimmed subjects need more {needMore}</span>
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {subjects.map((s, i) => (
          <CompareCard key={`${s.type}/${s.id}`} subject={s} mode={mode} index={i} onSelect={onSelect} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-body-sm rounded-panel border border-border text-foreground-muted hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-body-sm text-foreground-muted tabular-nums">{currentPage} / {totalPages}</span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-body-sm rounded-panel border border-border text-foreground-muted hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
