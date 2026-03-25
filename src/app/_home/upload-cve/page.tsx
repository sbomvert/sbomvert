'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
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
import {
  SubjectType,
  SUBJECT_TYPES,
  SubjectMetadata,
  SbomMetadata,
} from '@/services/artifactStorageService/artifactStorageService.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

interface CveSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
}

interface DetectedReport {
  scanner: string;
  scannerVersion: string;
  totalMatches: number;
  summary: CveSummary;
}

interface UploadState {
  status: UploadStatus;
  message?: string;
}

// ─── Format detection ─────────────────────────────────────────────────────────

function normaliseSeverity(s: string): keyof CveSummary {
  switch (s?.toLowerCase()) {
    case 'critical': return 'critical';
    case 'high':     return 'high';
    case 'medium':   return 'medium';
    case 'low':      return 'low';
    default:         return 'unknown';
  }
}

function detectCveReport(raw: unknown): DetectedReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Grype: { matches: [...], descriptor: { name, version } }
  if (Array.isArray(obj.matches) && obj.descriptor) {
    const desc = obj.descriptor as Record<string, unknown>;
    const scanner = (desc.name as string | undefined)?.toLowerCase() ?? 'grype';
    const scannerVersion = (desc.version as string | undefined) ?? '';
    const matches = obj.matches as Array<Record<string, unknown>>;
    const summary: CveSummary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
    const seen = new Set<string>();
    for (const m of matches) {
      const vuln = m.vulnerability as Record<string, unknown> | undefined;
      const id = vuln?.id as string | undefined;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      summary[normaliseSeverity(vuln?.severity as string)] += 1;
    }
    return { scanner, scannerVersion, totalMatches: seen.size, summary };
  }

  // Trivy: { SchemaVersion, Trivy: { Version }, Results: [...] }
  if (obj.SchemaVersion !== undefined && obj.Results) {
    const trivyMeta = obj.Trivy as Record<string, unknown> | undefined;
    const scannerVersion = (trivyMeta?.Version as string | undefined) ?? '';
    const results = obj.Results as Array<Record<string, unknown>>;
    const summary: CveSummary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
    const seen = new Set<string>();
    for (const r of results) {
      const vulns = r.Vulnerabilities as Array<Record<string, unknown>> | undefined;
      for (const v of vulns ?? []) {
        const id = v.VulnerabilityID as string | undefined;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        summary[normaliseSeverity(v.Severity as string)] += 1;
      }
    }
    return { scanner: 'trivy', scannerVersion, totalMatches: seen.size, summary };
  }

  return null;
}

function inferScannerFromFilename(filename: string): string {
  return filename.split('.')[0]?.toLowerCase() ?? '';
}

// ─── Severity preview ─────────────────────────────────────────────────────────

const SEV_CONFIG: Array<{
  key: keyof CveSummary; label: string; icon: React.ReactNode; color: string; bg: string;
}> = [
  { key: 'critical', label: 'Critical', icon: <ChevronsUp size={13} />,  color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20' },
  { key: 'high',     label: 'High',     icon: <ShieldAlert size={13} />, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { key: 'medium',   label: 'Medium',   icon: <Shield size={13} />,      color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { key: 'low',      label: 'Low',      icon: <ShieldCheck size={13} />, color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'unknown',  label: 'Unknown',  icon: <Minus size={13} />,       color: 'text-gray-500 dark:text-gray-400',     bg: 'bg-gray-100 dark:bg-gray-700' },
];

function SummaryPreview({ detected }: { detected: DetectedReport }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{detected.scanner}</span>
          {detected.scannerVersion && <span className="text-[10px] text-gray-400 font-mono">v{detected.scannerVersion}</span>}
        </div>
        <span className="text-xs text-gray-400 tabular-nums">
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

function DropZone({ file, onFile, onClear, detected }: DropZoneProps) {
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
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/10 cursor-default'
          : dragging
          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 scale-[1.01] cursor-copy'
          : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
      )}
    >
      <input ref={inputRef} type="file" accept=".json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

      {file ? (
        <div className="flex flex-col items-center gap-2 px-6 py-5 text-center w-full">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <FileJson size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {detected && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              {detected.scanner}
            </span>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Shield size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop your CVE report here</p>
            <p className="text-xs text-gray-400 mt-0.5">
              or <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">browse</span> · Grype or Trivy JSON
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared form primitives ───────────────────────────────────────────────────

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, error, disabled }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; error?: boolean; disabled?: boolean;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className={cn(
        'w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow placeholder:text-gray-400',
        disabled && 'opacity-60 cursor-not-allowed',
        error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
      )} />
  );
}

function SelectInput({ value, onChange, children, disabled, accent = 'emerald' }: {
  value: string; onChange: (v: string) => void;
  children: React.ReactNode; disabled?: boolean; accent?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className={cn(
        'w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
        `focus:outline-none focus:ring-2 focus:ring-${accent}-500 transition-shadow`,
        'border-gray-200 dark:border-gray-700',
        disabled && 'opacity-60 cursor-not-allowed'
      )}>
      {children}
    </select>
  );
}

// ─── Subject combobox (shared pattern with SBOM page) ────────────────────────

const NEW_SUBJECT_SENTINEL = '__new__';

const TYPE_ICON: Record<SubjectType, React.ReactNode> = {
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

function SubjectCombobox({
  subjects, loading, value, isNew, newLabel, newId,
  onPickExisting, onToggleNew, onNewLabelChange, onNewIdChange, error, accent = 'emerald',
}: SubjectComboboxProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <Loader2 size={14} className="animate-spin" /> Loading subjects…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {subjects.length > 0 && !isNew && (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === NEW_SUBJECT_SENTINEL) onToggleNew();
            else onPickExisting(e.target.value);
          }}
          className={cn(
            'w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            `focus:outline-none focus:ring-2 focus:ring-${accent}-500 transition-shadow`,
            error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
          )}
        >
          <option value="">Select a subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? s.id}
              {s.cves > 0 ? ` · ${s.cves} CVE report${s.cves !== 1 ? 's' : ''}` : ''}
              {s.sboms > 0 ? ` · ${s.sboms} SBOM${s.sboms !== 1 ? 's' : ''}` : ''}
            </option>
          ))}
          <option value={NEW_SUBJECT_SENTINEL}>＋ Create new subject…</option>
        </select>
      )}

      {(isNew || subjects.length === 0) && (
        <div className={cn(
          'flex flex-col gap-2 p-3 rounded-xl border',
          accent === 'emerald'
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10'
            : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10'
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              'flex items-center gap-1.5 text-xs font-medium',
              accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
            )}>
              <Plus size={12} /> New subject
            </div>
            {subjects.length > 0 && (
              <button type="button" onClick={onToggleNew}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                ← pick existing
              </button>
            )}
          </div>
          <input type="text" value={newLabel} onChange={(e) => onNewLabelChange(e.target.value)}
            placeholder="nginx:latest, my-service, …"
            className={cn(
              'w-full rounded-lg border px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:outline-none placeholder:text-gray-400',
              accent === 'emerald'
                ? 'border-emerald-200 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-500'
                : 'border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-500'
            )} />
          {newLabel && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 shrink-0">ID:</span>
              <input type="text" value={newId} onChange={(e) => onNewIdChange(e.target.value)}
                className="flex-1 font-mono text-xs rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              <span className="text-[10px] text-gray-400 shrink-0">auto-generated, editable</span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ─── Result banner ────────────────────────────────────────────────────────────

function ResultBanner({ state, subjectId, onReset, onGoHome }: {
  state: UploadState; subjectId: string; onReset: () => void; onGoHome: () => void;
}) {
  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">CVE report uploaded</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Saved to subject <span className="font-mono font-medium">{subjectId}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onReset} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Upload another
          </button>
          <button onClick={onGoHome} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
            View subjects <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Upload failed</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{state.message}</p>
        </div>
        <button onClick={onReset} className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0">Try again</button>
      </div>
    );
  }

  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadCvePage() {
  const router = useRouter();

  // File
  const [file, setFile] = useState<File | null>(null);
  const [detected, setDetected] = useState<DetectedReport | null>(null);
  const [rawContent, setRawContent] = useState('');

  // Subject
  const [subjectType, setSubjectType] = useState<SubjectType>(SubjectType.Container);
  const [subjects, setSubjects] = useState<SubjectMetadata[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [isNewSubject, setIsNewSubject] = useState(false);
  const [newSubjectLabel, setNewSubjectLabel] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');

  // SBOM tool
  const [sbomTool, setSbomTool] = useState('');
  const [availableSbomTools, setAvailableSbomTools] = useState<string[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);

  // Scanner (auto-detected)
  const [scanner, setScanner] = useState('');

  // Validation + upload
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });

  const resolvedSubjectId = isNewSubject ? newSubjectId : selectedSubjectId;

  // ── Load subjects on type change ──────────────────────────────────────────
  useEffect(() => {
    setSelectedSubjectId(''); setIsNewSubject(false);
    setNewSubjectLabel(''); setNewSubjectId('');
    setSbomTool(''); setAvailableSbomTools([]);
    setLoadingSubjects(true);
    fetch('/api/subjects?page=1')
      .then((r) => r.json())
      .then((d) => {
        const filtered = (d.subjects as SubjectMetadata[]).filter((s) => s.type === subjectType);
        setSubjects(filtered);
        if (filtered.length === 0) setIsNewSubject(true);
      })
      .catch(() => { setSubjects([]); setIsNewSubject(true); })
      .finally(() => setLoadingSubjects(false));
  }, [subjectType]);

  // ── Auto-generate slug ─────────────────────────────────────────────────────
  useEffect(() => {
    setNewSubjectId(toSlug(newSubjectLabel));
  }, [newSubjectLabel]);

  // ── Load SBOM tools for an existing selected subject ──────────────────────
  useEffect(() => {
    if (!selectedSubjectId || isNewSubject) {
      setAvailableSbomTools([]); setSbomTool(''); return;
    }
    setLoadingTools(true);
    fetch(`/api/subjects/${subjectType}/${encodeURIComponent(selectedSubjectId)}/sboms`)
      .then((r) => r.json())
      .then((d) => {
        const tools = [...new Set((d.sboms as SbomMetadata[]).map((s) => s.tool).filter(Boolean))];
        setAvailableSbomTools(tools);
        if (tools.length === 1) setSbomTool(tools[0]);
        else setSbomTool('');
      })
      .catch(() => { setAvailableSbomTools([]); setSbomTool(''); })
      .finally(() => setLoadingTools(false));
  }, [selectedSubjectId, isNewSubject, subjectType]);

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f); setDetected(null); setErrors({});
    setUploadState({ status: 'validating' });
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const report = detectCveReport(json);
      setDetected(report);
      setRawContent(text);
      if (report?.scanner) setScanner(report.scanner);
      else { const fn = inferScannerFromFilename(f.name); if (fn) setScanner(fn); }
      setUploadState({ status: 'idle' });
    } catch {
      setUploadState({ status: 'error', message: 'File is not valid JSON.' });
    }
  }, []);

  const handleClear = useCallback(() => {
    setFile(null); setDetected(null); setRawContent(''); setScanner('');
    setErrors({}); setUploadState({ status: 'idle' });
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!file) next.file = 'Please select a file.';
    if (!resolvedSubjectId.trim()) next.subjectId = 'Subject is required.';
    if (isNewSubject && !newSubjectLabel.trim()) next.subjectId = 'Enter a name for the new subject.';
    if (!sbomTool.trim()) next.sbomTool = 'Specify the SBOM tool this scan was run against.';
    if (!scanner.trim()) next.scanner = 'Scanner name is required.';
    if (!detected && file) next.file = 'Could not parse as a Grype or Trivy report.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setUploadState({ status: 'uploading' });

    try {
      // Create subject first if new (409 = already exists, that's fine)
      if (isNewSubject) {
        const createRes = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: subjectType,
            id: newSubjectId.trim(),
            name: newSubjectLabel.trim(),
          }),
        });
        if (!createRes.ok && createRes.status !== 409) {
          const b = await createRes.json().catch(() => ({}));
          throw new Error(b.error ?? `Failed to create subject (${createRes.status})`);
        }
      }

      // PUT = upsert, idempotent for re-running scanners
      const res = await fetch(
        `/api/subjects/${subjectType}/${encodeURIComponent(resolvedSubjectId.trim())}/cves`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sbomTool: sbomTool.trim(),
            scanner: scanner.trim(),
            content: rawContent,
            summary: detected?.summary,
            toolVersion: detected?.scannerVersion || undefined,
          }),
        }
      );

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Server error (${res.status})`);
      setUploadState({ status: 'success' });
    } catch (err) {
      setUploadState({ status: 'error', message: (err as Error).message });
    }
  }

  function handleReset() {
    handleClear();
    setSelectedSubjectId(''); setIsNewSubject(subjects.length === 0);
    setNewSubjectLabel(''); setNewSubjectId('');
    setSbomTool(''); setUploadState({ status: 'idle' });
  }

  const busy = uploadState.status === 'uploading' || uploadState.status === 'validating';

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Upload CVE report</h1>
        <p className="text-sm text-gray-400 mt-1">
          Add a Grype or Trivy vulnerability scan result to a subject. Re-uploading replaces the
          existing report for the same scanner / SBOM tool pair.
        </p>
      </div>

      {uploadState.status === 'success' ? (
        <ResultBanner state={uploadState} subjectId={resolvedSubjectId} onReset={handleReset} onGoHome={() => router.push('/home')} />
      ) : (
        <div className="flex flex-col gap-6">
          {uploadState.status === 'error' && (
            <ResultBanner state={uploadState} subjectId={resolvedSubjectId} onReset={handleReset} onGoHome={() => {}} />
          )}

          {/* Drop zone */}
          <Field label="CVE report file" error={errors.file}>
            <DropZone file={file} onFile={handleFile} onClear={handleClear} detected={detected} />
          </Field>

          {/* Severity preview */}
          {detected && <SummaryPreview detected={detected} />}

          {/* Subject */}
          <div className="flex flex-col gap-3">
            {/* Type toggle */}
            <div className="flex gap-1">
              {(SUBJECT_TYPES as readonly SubjectType[]).map((t) => (
                <button key={t} type="button" onClick={() => setSubjectType(t)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all capitalize',
                    subjectType === t
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-300'
                  )}>
                  {TYPE_ICON[t]}{t}
                </button>
              ))}
            </div>

            <Field label="Subject" error={errors.subjectId}>
              <SubjectCombobox
                subjects={subjects}
                loading={loadingSubjects}
                value={selectedSubjectId}
                isNew={isNewSubject}
                newLabel={newSubjectLabel}
                newId={newSubjectId}
                onPickExisting={(id) => { setSelectedSubjectId(id); setIsNewSubject(false); setErrors((e) => ({ ...e, subjectId: '' })); }}
                onToggleNew={() => { setIsNewSubject((v) => !v); setSelectedSubjectId(''); setSbomTool(''); setAvailableSbomTools([]); }}
                onNewLabelChange={setNewSubjectLabel}
                onNewIdChange={setNewSubjectId}
                error={errors.subjectId}
                accent="emerald"
              />
            </Field>
          </div>

          {/* SBOM tool + scanner */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="SBOM tool" hint="scanned against" error={errors.sbomTool}>
              {loadingTools ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
              ) : !isNewSubject && availableSbomTools.length > 0 ? (
                // Existing subject with known SBOMs → dropdown
                <SelectInput
                  value={sbomTool}
                  onChange={(v) => { setSbomTool(v); setErrors((e) => ({ ...e, sbomTool: '' })); }}
                >
                  <option value="">Select tool…</option>
                  {availableSbomTools.map((t) => <option key={t} value={t}>{t}</option>)}
                </SelectInput>
              ) : (
                // New subject or no SBOMs yet → free-text
                <TextInput
                  value={sbomTool}
                  onChange={(v) => { setSbomTool(v); setErrors((e) => ({ ...e, sbomTool: '' })); }}
                  placeholder="syft"
                  error={!!errors.sbomTool}
                  disabled={!resolvedSubjectId && !isNewSubject}
                />
              )}
            </Field>

            <Field label="Scanner" hint="auto-detected" error={errors.scanner}>
              <TextInput
                value={scanner}
                onChange={(v) => { setScanner(v); setErrors((e) => ({ ...e, scanner: '' })); }}
                placeholder="grype"
                error={!!errors.scanner}
              />
            </Field>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !file}
            className={cn(
              'inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all',
              busy || !file
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md'
            )}
          >
            {busy ? (
              <><Loader2 size={16} className="animate-spin" />
                {uploadState.status === 'validating' ? 'Validating…' : 'Uploading…'}</>
            ) : (
              <><Upload size={16} />Upload CVE report</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}