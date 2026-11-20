'use client';
import { useCallback, useRef, useState } from 'react';
import {
  FileJson,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
  Container,
  GitBranch,
  Box,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ChevronsUp,
  Minus,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button/Button';
import { Input } from '@/components/input/Input';
import { Selector } from '@/components/select/Selector';
import { fieldSelectorClass } from '@/components/input/fieldStyles';
import { SubjectType, SubjectMetadata } from '@/services/artifactStorageService/artifactStorageService.types';

// The pieces of the CVE report upload page (app/compare/upload/cve-report)

export type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

export interface CveSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
}

export interface DetectedReport {
  scanner: string;
  scannerVersion: string;
  totalMatches: number;
  summary: CveSummary;
}

export interface UploadState {
  status: UploadStatus;
  message?: string;
}

// ─── Severity preview ─────────────────────────────────────────────────────────

const SEV_CONFIG: Array<{
  key: keyof CveSummary; label: string; icon: React.ReactNode; color: string; bg: string;
}> = [
  { key: 'critical', label: 'Critical', icon: <ChevronsUp size={13} />,  color: 'text-error',       bg: 'bg-error-subtle' },
  { key: 'high',     label: 'High',     icon: <ShieldAlert size={13} />, color: 'text-warning', bg: 'bg-warning-subtle' },
  { key: 'medium',   label: 'Medium',   icon: <Shield size={13} />,      color: 'text-warning', bg: 'bg-warning-subtle' },
  { key: 'low',      label: 'Low',      icon: <ShieldCheck size={13} />, color: 'text-info',     bg: 'bg-info-subtle' },
  { key: 'unknown',  label: 'Unknown',  icon: <Minus size={13} />,       color: 'text-foreground-muted',     bg: 'bg-surface-alt' },
];

export function SummaryPreview({ detected }: { detected: DetectedReport }) {
  return (
    <div className="rounded-panel border border-border-subtle p-4 bg-surface-alt">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-label font-semibold uppercase tracking-wider text-foreground-muted">{detected.scanner}</span>
          {detected.scannerVersion && <span className="text-label text-foreground-subtle font-mono">v{detected.scannerVersion}</span>}
        </div>
        <span className="text-caption text-foreground-subtle tabular-nums">
          {detected.totalMatches} unique CVE{detected.totalMatches !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {SEV_CONFIG.map(({ key, label, icon, color, bg }) => (
          <div key={key} className={cn('flex flex-col items-center gap-1 rounded-lg p-2', bg)}>
            <span className={cn('flex items-center gap-0.5 text-[10px] font-medium', color)}>{icon}{label}</span>
            <span className={cn('text-lg font-bold tabular-nums leading-none', color)}>{detected.summary[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

interface DropZoneProps {
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  detected: DetectedReport | null;
}

export function DropZone({ file, onFile, onClear, detected }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all min-h-[160px]',
        file
          ? 'border-success bg-success-subtle/40 cursor-default'
          : dragging
          ? 'border-success bg-success-subtle scale-[1.01] cursor-copy'
          : 'border-border hover:border-success hover:bg-surface-alt cursor-pointer'
      )}
    >
      <input ref={inputRef} type="file" accept=".json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

      {file ? (
        <div className="flex flex-col items-center gap-2 px-6 py-5 text-center w-full">
          <div className="w-10 h-10 rounded-xl bg-success-subtle flex items-center justify-center">
            <FileJson size={20} className="text-success" />
          </div>
          <div>
            <p className="font-medium text-foreground text-body-sm">{file.name}</p>
            <p className="text-caption text-foreground-subtle mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {detected && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-success-subtle text-success-fg">
              {detected.scanner}
            </span>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-3 right-3 p-1 rounded-panel text-foreground-subtle hover:text-foreground hover:bg-surface-alt transition-colors">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-surface-alt flex items-center justify-center">
            <Shield size={20} className="text-foreground-subtle" />
          </div>
          <div>
            <p className="text-body-sm font-medium text-foreground-muted">Drop your CVE report here</p>
            <p className="text-caption text-foreground-subtle mt-0.5">
              or <span className="text-success underline underline-offset-2">browse</span> · Grype or Trivy JSON
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared form primitives ───────────────────────────────────────────────────

export function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-body-sm font-medium text-foreground-muted">{label}</label>
        {hint && <span className="text-xs text-foreground-subtle">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}

// ─── Subject combobox (shared pattern with SBOM page) ────────────────────────

export const NEW_SUBJECT_SENTINEL = '__new__';

export const TYPE_ICON: Record<SubjectType, React.ReactNode> = {
  [SubjectType.Container]: <Container size={13} />,
  [SubjectType.Repository]: <GitBranch size={13} />,
  [SubjectType.Other]: <Box size={13} />,
};

interface SubjectComboboxProps {
  subjects: SubjectMetadata[];
  loading: boolean;
  value: string;
  isNew: boolean;
  newLabel: string;
  newId: string;
  onPickExisting: (id: string) => void;
  onToggleNew: () => void;
  onNewLabelChange: (label: string) => void;
  onNewIdChange: (id: string) => void;
  error?: string;
  accent?: string;
}

export function SubjectCombobox({
  subjects, loading, value, isNew, newLabel, newId,
  onPickExisting, onToggleNew, onNewLabelChange, onNewIdChange, error, accent = 'emerald',
}: SubjectComboboxProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-body-sm text-foreground-subtle py-2">
        <Loader2 size={14} className="animate-spin" /> Loading subjects…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {subjects.length > 0 && !isNew && (
        <Selector
          aria-label="Subject"
          variant="unfocused"
          className={cn(fieldSelectorClass, error && 'border-error')}
          value={value || null}
          onValueChange={(v) => (v === NEW_SUBJECT_SENTINEL ? onToggleNew() : onPickExisting(v))}
          placeholder="Select a subject…"
          options={[
            ...subjects.map((s) => ({
              value: s.id,
              label: `${s.name ?? s.id}${s.cves > 0 ? ` · ${s.cves} CVE report${s.cves !== 1 ? 's' : ''}` : ''}${s.sboms > 0 ? ` · ${s.sboms} SBOM${s.sboms !== 1 ? 's' : ''}` : ''}`,
            })),
            { value: NEW_SUBJECT_SENTINEL, label: '＋ Create new subject…' },
          ]}
        />
      )}

      {(isNew || subjects.length === 0) && (
        <div className={cn(
          'flex flex-col gap-2 p-3 rounded-xl border',
          accent === 'emerald'
            ? 'border-success bg-success-subtle/30'
            : 'border-info bg-info-subtle/30'
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              'flex items-center gap-1.5 text-xs font-medium',
              accent === 'emerald' ? 'text-success' : 'text-info'
            )}>
              <Plus size={12} /> New subject
            </div>
            {subjects.length > 0 && (
              <button type="button" onClick={onToggleNew}
                className="text-caption text-foreground-subtle hover:text-foreground">
                ← pick existing
              </button>
            )}
          </div>
          <Input aria-label="New subject" value={newLabel} onChange={(e) => onNewLabelChange(e.target.value)}
            placeholder="nginx:latest, my-service, …" className="text-body-sm placeholder:text-foreground-subtle" />
          {newLabel && (
            <div className="flex items-center gap-2">
              <span className="text-label text-foreground-subtle shrink-0">ID:</span>
              <Input aria-label="Subject ID" value={newId} onChange={(e) => onNewIdChange(e.target.value)}
                className="flex-1 font-mono text-caption py-1" />
              <span className="text-label text-foreground-subtle shrink-0">auto-generated, editable</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}

// ─── Result banner ────────────────────────────────────────────────────────────

export function ResultBanner({ state, subjectId, onReset, onGoHome }: {
  state: UploadState; subjectId: string; onReset: () => void; onGoHome: () => void;
}) {
  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-success-subtle flex items-center justify-center">
          <CheckCircle2 size={28} className="text-success" />
        </div>
        <div>
          <p className="font-semibold text-foreground">CVE report uploaded</p>
          <p className="text-body-sm text-foreground-muted mt-0.5">
            Saved to subject <span className="font-mono font-medium">{subjectId}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onReset} size="sm" variant="secondary" withHover>
            Upload another
          </Button>
          <Button onClick={onGoHome} size="sm" withHover>
            View subjects <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-error-subtle border border-error">
        <AlertCircle size={18} className="text-error shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-medium text-error-fg">Upload failed</p>
          <p className="text-caption text-error-fg mt-0.5">{state.message}</p>
        </div>
        <button onClick={onReset} className="text-caption text-error hover:opacity-80 font-medium shrink-0">Try again</button>
      </div>
    );
  }

  return null;
}
