'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Container, GitBranch, Box, Clock, ChevronRight } from 'lucide-react';
import { SubjectMetadata, SubjectType } from '@/services/artifactStorageService/artifactStorageService.types';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubjectAction = 'sbom' | 'cve';

export interface SubjectCardProps {
  subject: SubjectMetadata;
  index?: number;
  onSelect: (subject: SubjectMetadata, action: SubjectAction) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function SubjectIcon({ type }: { type: SubjectType }) {
  const props = { size: 18, strokeWidth: 1.75 };
  if (type === SubjectType.Container) return <Container {...props} />;
  if (type === SubjectType.Repository) return <GitBranch {...props} />;
  return <Box {...props} />;
}

const TYPE_LABEL: Record<SubjectType, string> = {
  [SubjectType.Container]: 'container',
  [SubjectType.Repository]: 'repository',
  [SubjectType.Other]: 'other',
};

const TYPE_STYLE: Record<SubjectType, string> = {
  [SubjectType.Container]: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  [SubjectType.Repository]: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  [SubjectType.Other]: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

function TypeBadge({ type }: { type: SubjectType }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md',
      TYPE_STYLE[type]
    )}>
      <SubjectIcon type={type} />
      {TYPE_LABEL[type]}
    </span>
  );
}

function splitName(name: string): { label: string; prefix: string | null } {
  const parts = name.split('/');
  const label = parts.pop() ?? name;
  const prefix = parts.length > 0 ? parts.join('/') : null;
  return { label, prefix };
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

interface StatPillProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  active: boolean;
  color: string; // tailwind bg class
  onClick: () => void;
  disabled?: boolean;
}

function StatPill({ icon, count, label, active, color, onClick, disabled }: StatPillProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? `Need at least 2 ${label}s to compare` : `Compare ${label}s`}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all',
        'border text-sm font-medium',
        disabled
          ? 'border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          : active
          ? `${color} border-transparent shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer`
          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 cursor-pointer'
      )}
    >
      <span className={cn('shrink-0', disabled ? 'opacity-40' : '')}>{icon}</span>
      <span className="tabular-nums font-bold text-base leading-none">{count}</span>
      <span className="text-xs leading-none">{label}</span>
      {!disabled && (
        <ChevronRight
          size={13}
          className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, index = 0, onSelect }) => {
  const { label, prefix } = splitName(subject.name ?? subject.id);
  const canCompareSbom = subject.sboms >= 2;
  const canCompareCve = subject.cves >= 1;
  const updatedAt = subject.updatedAt ?? subject.createdAt;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        'relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm',
        'border border-gray-100 dark:border-gray-700/60',
        'overflow-hidden transition-shadow hover:shadow-md'
      )}
    >
      {/* Top accent bar — colour indicates richness */}
      <div
        className={cn(
          'h-0.5 w-full',
          canCompareSbom && canCompareCve
            ? 'bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500'
            : canCompareSbom
            ? 'bg-indigo-500'
            : 'bg-gray-200 dark:bg-gray-700'
        )}
      />

      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* ── Header ── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <TypeBadge type={subject.type} />
          </div>

          <div className="min-w-0">
            {prefix && (
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate leading-none mb-0.5">
                {prefix}
              </p>
            )}
            <h3 className="font-semibold text-gray-900 dark:text-white truncate leading-tight">
              {label}
            </h3>
            {subject.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                {subject.description}
              </p>
            )}
          </div>
        </div>

        {/* ── Tags ── */}
        {subject.tags && subject.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {subject.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Action stat pills ── */}
        <div className="grid grid-cols-2 gap-2">
          <StatPill
            icon={<FileText size={14} />}
            count={subject.sboms}
            label="SBOMs"
            active={canCompareSbom}
            color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800"
            onClick={() => onSelect(subject, 'sbom')}
            disabled={!canCompareSbom}
          />
          <StatPill
            icon={<Shield size={14} />}
            count={subject.cves}
            label="CVE reports"
            active={canCompareCve}
            color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800"
            onClick={() => onSelect(subject, 'cve')}
            disabled={!canCompareCve}
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 mt-auto pt-1 border-t border-gray-50 dark:border-gray-700/50">
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

// ─── Grid wrapper ─────────────────────────────────────────────────────────────

export interface SubjectGridProps {
  subjects: SubjectMetadata[];
  onSelect: (subject: SubjectMetadata, action: SubjectAction) => void;
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({ subjects, onSelect }) => {
  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Container size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No subjects found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Upload an SBOM to get started.
        </p>
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