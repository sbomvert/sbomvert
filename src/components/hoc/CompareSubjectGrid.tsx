'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Container, GitBranch, Box, Clock, ChevronRight, Package } from 'lucide-react';
import { SubjectMetadata, SubjectType } from '@/services/artifactStorageService/artifactStorageService.types';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompareMode = 'SBOM' | 'CVE';

export interface CompareSubjectGridProps {
  subjects: SubjectMetadata[];
  mode: CompareMode;
  onSelect: (subject: SubjectMetadata) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay  = Math.floor(diffHr / 24);
  if (diffSec < 60)  return 'just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay <  7)  return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function splitName(name: string): { label: string; prefix: string | null } {
  const parts = name.split('/');
  const label = parts.pop() ?? name;
  return { label, prefix: parts.length > 0 ? parts.join('/') : null };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TYPE_ICON: Record<SubjectType, React.ReactNode> = {
  [SubjectType.Container]:  <Container  size={12} strokeWidth={1.75} />,
  [SubjectType.Repository]: <GitBranch  size={12} strokeWidth={1.75} />,
  [SubjectType.Other]:      <Box        size={12} strokeWidth={1.75} />,
};

const TYPE_STYLE: Record<SubjectType, string> = {
  [SubjectType.Container]:  'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  [SubjectType.Repository]: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  [SubjectType.Other]:      'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

function TypeBadge({ type }: { type: SubjectType }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md',
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
  colorActive: string;
}

function CountPill({ icon, count, label, active, colorActive }: CountPillProps) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
      active ? colorActive : 'bg-gray-100 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500'
    )}>
      {icon}
      <span className="tabular-nums font-bold">{count}</span>
      <span className="font-normal opacity-80">{label}</span>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

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
    ? mode === 'SBOM'
      ? `Need at least 2 SBOMs (has ${subject.sboms})`
      : `No CVE reports yet`
    : null;

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
          'w-full text-left rounded-2xl border overflow-hidden transition-all duration-150',
          'bg-white dark:bg-gray-800',
          isSelectable
            ? 'border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700/50 cursor-pointer group'
            : 'border-gray-100 dark:border-gray-700/40 opacity-50 cursor-not-allowed'
        )}
      >
        {/* Accent bar */}
        <div className={cn(
          'h-0.5 w-full',
          mode === 'SBOM'
            ? canSelectSbom ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
            : canSelectCve  ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
        )} />

        <div className="p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <TypeBadge type={subject.type} />
              </div>
              {prefix && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-none mb-0.5">
                  {prefix}
                </p>
              )}
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate leading-tight">
                {label}
              </h3>
              {subject.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  {subject.description}
                </p>
              )}
            </div>

            {/* Arrow shown on hover when selectable */}
            {isSelectable && (
              <ChevronRight
                size={16}
                className="shrink-0 mt-1 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors"
              />
            )}
          </div>

          {/* Counts */}
          <div className="flex gap-2">
            <CountPill
              icon={<FileText size={11} />}
              count={subject.sboms}
              label="SBOMs"
              active={subject.sboms >= 2}
              colorActive="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
            />
            <CountPill
              icon={<Shield size={11} />}
              count={subject.cves}
              label="CVEs"
              active={subject.cves >= 1}
              colorActive="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
            />
          </div>

          {/* Disabled reason or footer */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            {disabledReason ? (
              <span className="text-amber-500 dark:text-amber-400">{disabledReason}</span>
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

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function CompareSubjectGrid({
  subjects,
  mode,
  onSelect,
  currentPage,
  totalPages,
  onPageChange,
}: CompareSubjectGridProps) {
  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Package size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No subjects found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Upload an SBOM or CVE report to get started.
        </p>
      </div>
    );
  }

  const selectable = subjects.filter((s) =>
    mode === 'SBOM' ? s.sboms >= 2 : s.cves >= 1
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Mode hint */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {selectable} of {subjects.length} subject{subjects.length !== 1 ? 's' : ''} available for{' '}
        <span className={mode === 'SBOM' ? 'text-indigo-500' : 'text-emerald-500'}>
          {mode === 'SBOM' ? 'SBOM comparison' : 'CVE comparison'}
        </span>
        {selectable < subjects.length && (
          <span className="ml-1 text-gray-400">
            · dimmed subjects need more {mode === 'SBOM' ? 'SBOMs' : 'CVE reports'}
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {subjects.map((s, i) => (
          <CompareCard
            key={`${s.type}/${s.id}`}
            subject={s}
            mode={mode}
            index={i}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500 tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}