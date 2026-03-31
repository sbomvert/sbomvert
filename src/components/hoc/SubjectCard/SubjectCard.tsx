'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Container, GitBranch, Box, Clock, ChevronRight } from 'lucide-react';
import { SubjectMetadata, SubjectType } from '@/services/artifactStorageService/artifactStorageService.types';
import { cn } from '@/lib/utils';

export type SubjectAction = 'sbom' | 'cve';

export interface SubjectCardProps {
  subject: SubjectMetadata;
  index?: number;
  onSelect: (subject: SubjectMetadata, action: SubjectAction) => void;
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs  = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffSec < 60)  return 'just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDays < 7)  return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function SubjectIcon({ type }: { type: SubjectType }) {
  const props = { size: 18, strokeWidth: 1.75 };
  if (type === SubjectType.Container)  return <Container {...props} />;
  if (type === SubjectType.Repository) return <GitBranch {...props} />;
  return <Box {...props} />;
}

const TYPE_LABEL: Record<SubjectType, string> = {
  [SubjectType.Container]:  'container',
  [SubjectType.Repository]: 'repository',
  [SubjectType.Other]:      'other',
};

// Use semantic colour tokens for type badges
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
      <SubjectIcon type={type} />
      {TYPE_LABEL[type]}
    </span>
  );
}

function splitName(name: string): { label: string; prefix: string | null } {
  const parts = name.split('/');
  const label  = parts.pop() ?? name;
  const prefix = parts.length > 0 ? parts.join('/') : null;
  return { label, prefix };
}

interface StatPillProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
  disabled?: boolean;
}

function StatPill({ icon, count, label, active, activeClass, onClick, disabled }: StatPillProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? `Need at least 2 ${label}s to compare` : `Compare ${label}s`}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-card text-left transition-all',
        'border text-body-sm font-medium',
        disabled
          ? 'border-border-subtle text-foreground-subtle cursor-not-allowed'
          : active
          ? `${activeClass} border-transparent shadow-panel hover:shadow-card hover:scale-[1.02] cursor-pointer`
          : 'border-border text-foreground-muted hover:border-border cursor-pointer'
      )}
    >
      <span className={cn('shrink-0', disabled ? 'opacity-40' : '')}>{icon}</span>
      <span className="tabular-nums font-bold text-body leading-none">{count}</span>
      <span className="text-caption leading-none">{label}</span>
      {!disabled && (
        <ChevronRight size={13} className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, index = 0, onSelect }) => {
  const { label, prefix } = splitName(subject.name ?? subject.id);
  const canCompareSbom = subject.sboms >= 2;
  const canCompareCve  = subject.cves  >= 1;
  const updatedAt = subject.updatedAt ?? subject.createdAt;

  const accentBar = canCompareSbom && canCompareCve
    ? 'bg-gradient-to-r from-primary via-success to-primary'
    : canCompareSbom
    ? 'bg-primary'
    : 'bg-border';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        'relative flex flex-col bg-surface rounded-card-lg shadow-card',
        'border border-border-subtle',
        'overflow-hidden transition-shadow hover:shadow-card-hover'
      )}
    >
      {/* Top accent bar */}
      <div className={cn('h-0.5 w-full', accentBar)} />

      <div className="flex flex-col flex-1 p-card-p gap-4">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <TypeBadge type={subject.type} />
          </div>
          <div className="min-w-0">
            {prefix && (
              <p className="text-label font-medium text-foreground-subtle truncate leading-none mb-0.5">{prefix}</p>
            )}
            <h3 className="font-semibold text-foreground truncate leading-tight">{label}</h3>
            {subject.description && (
              <p className="text-caption text-foreground-muted mt-0.5 line-clamp-1">{subject.description}</p>
            )}
          </div>
        </div>

        {/* Tags */}
        {subject.tags && subject.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {subject.tags.map(tag => (
              <span key={tag} className="inline-block text-caption font-medium px-2 py-0.5 rounded-pill bg-surface-alt text-foreground-muted">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stat pills */}
        <div className="grid grid-cols-2 gap-2">
          <StatPill
            icon={<FileText size={14} />}
            count={subject.sboms}
            label="SBOMs"
            active={canCompareSbom}
            activeClass="bg-info-subtle text-info-fg"
            onClick={() => onSelect(subject, 'sbom')}
            disabled={!canCompareSbom}
          />
          <StatPill
            icon={<Shield size={14} />}
            count={subject.cves}
            label="CVE reports"
            active={canCompareCve}
            activeClass="bg-success-subtle text-success-fg"
            onClick={() => onSelect(subject, 'cve')}
            disabled={!canCompareCve}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 text-label text-foreground-subtle mt-auto pt-1 border-t border-border-subtle">
          <Clock size={11} className="shrink-0" />
          <span>Updated {formatRelativeTime(updatedAt)}</span>
          {subject.owner && (
            <>
              <span className="mx-1">·</span>
              <span className="truncate">{subject.owner}</span>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
};

export interface SubjectGridProps {
  subjects: SubjectMetadata[];
  onSelect: (subject: SubjectMetadata, action: SubjectAction) => void;
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({ subjects, onSelect }) => {
  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-card-lg bg-surface-alt flex items-center justify-center mb-4">
          <Container size={24} className="text-foreground-subtle" />
        </div>
        <p className="text-foreground font-medium mb-1">No subjects found</p>
        <p className="text-body-sm text-foreground-muted">Upload an SBOM to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {subjects.map((s, i) => (
        <SubjectCard key={`${s.type}/${s.id}`} subject={s} index={i} onSelect={onSelect} />
      ))}
    </div>
  );
};
