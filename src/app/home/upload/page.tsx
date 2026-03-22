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
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SubjectType,
  SUBJECT_TYPES,
  SubjectMetadata,
} from '@/services/artifactStorageService/artifactStorageService.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

interface DetectedFormat {
  format: 'SPDX' | 'CycloneDX' | null;
  tool: string;
  toolVersion?: string;
}

interface UploadState {
  status: UploadStatus;
  message?: string;
  artifactId?: string;
}

// ─── Format detection ─────────────────────────────────────────────────────────

function detectFormat(raw: unknown): DetectedFormat {
  if (!raw || typeof raw !== 'object') return { format: null, tool: '' };
  const obj = raw as Record<string, unknown>;

  if (typeof obj.spdxVersion === 'string') {
    const ci = obj.creationInfo as Record<string, unknown> | undefined;
    const creators = (Array.isArray(ci?.creators) ? ci!.creators : []) as string[];
    const toolEntry = creators.find((c) => c.toLowerCase().startsWith('tool:'));
    const rawTool = toolEntry ? toolEntry.replace(/^tool:\s*/i, '').trim() : '';
    const [tool, toolVersion] = rawTool.split('-');
    return { format: 'SPDX', tool: tool?.toLowerCase() ?? '', toolVersion };
  }

  if (typeof obj.bomFormat === 'string' && obj.bomFormat === 'CycloneDX') {
    const meta = obj.metadata as Record<string, unknown> | undefined;
    const tools = meta?.tools as Array<Record<string, unknown>> | undefined;
    const toolName = (tools?.[0]?.name as string | undefined)?.toLowerCase() ?? '';
    const toolVersion = tools?.[0]?.version as string | undefined;
    return { format: 'CycloneDX', tool: toolName, toolVersion };
  }

  return { format: null, tool: '' };
}

function inferToolFromFilename(filename: string): string {
  return filename.split('.')[0] ?? '';
}

// ─── UI constants ─────────────────────────────────────────────────────────────

const FORMAT_BADGE: Record<string, string> = {
  SPDX: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CycloneDX: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const TYPE_ICON: Record<SubjectType, React.ReactNode> = {
  [SubjectType.Container]: <Container size={14} />,
  [SubjectType.Repository]: <GitBranch size={14} />,
  [SubjectType.Other]: <Box size={14} />,
};

// ─── Drop zone ────────────────────────────────────────────────────────────────

interface DropZoneProps {
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  detected: DetectedFormat | null;
}

function DropZone({ file, onFile, onClear, detected }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all min-h-[180px] cursor-pointer select-none',
        file
          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/10 cursor-default'
          : dragging
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {file ? (
        <div className="flex flex-col items-center gap-3 px-6 py-4 text-center w-full">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <FileJson size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{file.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {detected?.format && (
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide', FORMAT_BADGE[detected.format])}>
              {detected.format}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Upload size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop your SBOM file here</p>
            <p className="text-xs text-gray-400 mt-0.5">
              or <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">browse</span> · JSON only (SPDX or CycloneDX)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

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

function TextInput({ value, onChange, placeholder, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow placeholder:text-gray-400',
        error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
      )}
    />
  );
}

// ─── Subject combobox ─────────────────────────────────────────────────────────
// Shows existing subjects as options + a "Create new" option.
// When "Create new" is selected, an ID field appears pre-filled with a slug.

const NEW_SUBJECT_SENTINEL = '__new__';

interface SubjectComboboxProps {
  subjectType: SubjectType;
  subjects: SubjectMetadata[];
  loading: boolean;
  /** The resolved subject ID (may be typed by user or picked from list) */
  value: string;
  isNew: boolean;
  newLabel: string;
  onPickExisting: (id: string) => void;
  onToggleNew: () => void;
  onNewLabelChange: (label: string) => void;
  onNewIdChange: (id: string) => void;
  newId: string;
  error?: string;
}

function SubjectCombobox({
  subjects,
  loading,
  value,
  isNew,
  newLabel,
  newId,
  onPickExisting,
  onToggleNew,
  onNewLabelChange,
  onNewIdChange,
  error,
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
      {/* Existing subjects list */}
      {subjects.length > 0 && !isNew && (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === NEW_SUBJECT_SENTINEL) onToggleNew();
            else onPickExisting(e.target.value);
          }}
          className={cn(
            'w-full rounded-xl border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow',
            error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
          )}
        >
          <option value="">Select a subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? s.id}
              {s.sboms > 0 ? ` · ${s.sboms} SBOM${s.sboms !== 1 ? 's' : ''}` : ''}
            </option>
          ))}
          <option value={NEW_SUBJECT_SENTINEL}>＋ Create new subject…</option>
        </select>
      )}

      {/* Create new — shown either when there are no subjects, or user chose "+ Create new" */}
      {(isNew || subjects.length === 0) && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Plus size={12} />
              New subject
            </div>
            {subjects.length > 0 && (
              <button
                type="button"
                onClick={onToggleNew}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ← pick existing
              </button>
            )}
          </div>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => onNewLabelChange(e.target.value)}
            placeholder="nginx:latest, my-service, …"
            className="w-full rounded-lg border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
          />
          {newLabel && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 shrink-0">ID:</span>
              <input
                type="text"
                value={newId}
                onChange={(e) => onNewIdChange(e.target.value)}
                className="flex-1 font-mono text-xs rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
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

function ResultBanner({ state, subjectId, onReset, onGoToSubject }: {
  state: UploadState; subjectId: string; onReset: () => void; onGoToSubject: () => void;
}) {
  if (state.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">SBOM uploaded successfully</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Saved to subject <span className="font-mono font-medium">{subjectId}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onReset} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Upload another
          </button>
          <button onClick={onGoToSubject} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
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

export default function UploadPage() {
  const router = useRouter();

  // File
  const [file, setFile] = useState<File | null>(null);
  const [detected, setDetected] = useState<DetectedFormat | null>(null);
  const [rawContent, setRawContent] = useState<string>('');

  // Subject
  const [subjectType, setSubjectType] = useState<SubjectType>(SubjectType.Container);
  const [subjects, setSubjects] = useState<SubjectMetadata[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [isNewSubject, setIsNewSubject] = useState(false);
  const [newSubjectLabel, setNewSubjectLabel] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');

  // Tool + source
  const [tool, setTool] = useState('');
  const [source, setSource] = useState('');

  // Validation + status
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });

  // Resolved subject ID for the current form state
  const resolvedSubjectId = isNewSubject ? newSubjectId : selectedSubjectId;

  // ── Load subjects when type changes ────────────────────────────────────────
  useEffect(() => {
    setSelectedSubjectId('');
    setIsNewSubject(false);
    setNewSubjectLabel('');
    setNewSubjectId('');
    setLoadingSubjects(true);
    fetch(`/api/subjects?page=1`)
      .then((r) => r.json())
      .then((d) => {
        const filtered = (d.subjects as SubjectMetadata[]).filter((s) => s.type === subjectType);
        setSubjects(filtered);
        // If no subjects exist, go straight to create mode
        if (filtered.length === 0) setIsNewSubject(true);
      })
      .catch(() => { setSubjects([]); setIsNewSubject(true); })
      .finally(() => setLoadingSubjects(false));
  }, [subjectType]);

  // ── Auto-generate slug from label ──────────────────────────────────────────
  useEffect(() => {
    setNewSubjectId(toSlug(newSubjectLabel));
  }, [newSubjectLabel]);

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setDetected(null);
    setErrors({});
    setUploadState({ status: 'validating' });
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const fmt = detectFormat(json);
      setDetected(fmt);
      setRawContent(text);
      if (fmt.tool) setTool(fmt.tool);
      else { const fn = inferToolFromFilename(f.name); if (fn) setTool(fn); }
      setUploadState({ status: 'idle' });
    } catch {
      setDetected({ format: null, tool: '' });
      setUploadState({ status: 'error', message: 'File is not valid JSON.' });
    }
  }, []);

  const handleClear = useCallback(() => {
    setFile(null); setDetected(null); setRawContent(''); setTool('');
    setErrors({}); setUploadState({ status: 'idle' });
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!file) next.file = 'Please select a file.';
    if (!resolvedSubjectId.trim()) next.subjectId = 'Subject ID is required.';
    else if (/\s/.test(resolvedSubjectId)) next.subjectId = 'Subject ID must not contain spaces.';
    if (isNewSubject && !newSubjectLabel.trim()) next.subjectId = 'Enter a name for the new subject.';
    if (!tool.trim()) next.tool = 'Tool name is required.';
    if (detected?.format === null && file) next.file = 'Could not detect SPDX or CycloneDX format.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setUploadState({ status: 'uploading' });

    try {
      // If creating a new subject, create it first (subject is auto-created by
      // saveSBOM in the storage service, but we also want to set the name/description)
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
        // 409 means it already exists — that's fine, continue with upload
        if (!createRes.ok && createRes.status !== 409) {
          const b = await createRes.json().catch(() => ({}));
          throw new Error(b.error ?? `Failed to create subject (${createRes.status})`);
        }
      }

      const formData = new FormData();
      formData.append('file', file!);
      formData.append('tool', tool.trim());
      if (source.trim()) formData.append('source', source.trim());
      if (detected?.format) formData.append('format', detected.format.toLowerCase());
      if (detected?.toolVersion) formData.append('toolVersion', detected.toolVersion);

      const res = await fetch(
        `/api/subjects/${subjectType}/${encodeURIComponent(resolvedSubjectId.trim())}/sboms`,
        { method: 'POST', body: formData }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Server error (${res.status})`);

      setUploadState({ status: 'success', artifactId: body.id });
    } catch (err) {
      setUploadState({ status: 'error', message: (err as Error).message });
    }
  }

  function handleReset() {
    handleClear();
    setSelectedSubjectId(''); setIsNewSubject(subjects.length === 0);
    setNewSubjectLabel(''); setNewSubjectId('');
    setSource(''); setUploadState({ status: 'idle' });
  }

  const busy = uploadState.status === 'uploading' || uploadState.status === 'validating';

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Upload SBOM</h1>
        <p className="text-sm text-gray-400 mt-1">
          Add a Software Bill of Materials to a subject. Format is detected automatically.
        </p>
      </div>

      {uploadState.status === 'success' ? (
        <ResultBanner
          state={uploadState}
          subjectId={resolvedSubjectId}
          onReset={handleReset}
          onGoToSubject={() => router.push('/home')}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {uploadState.status === 'error' && (
            <ResultBanner state={uploadState} subjectId={resolvedSubjectId} onReset={handleReset} onGoToSubject={() => {}} />
          )}

          {/* Drop zone */}
          <Field label="SBOM file" error={errors.file}>
            <DropZone file={file} onFile={handleFile} onClear={handleClear} detected={detected} />
          </Field>

          {/* Subject */}
          <div className="flex flex-col gap-3">
            {/* Type toggle */}
            <div className="flex gap-1">
              {(SUBJECT_TYPES as readonly SubjectType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSubjectType(t)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all capitalize',
                    subjectType === t
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300'
                  )}
                >
                  {TYPE_ICON[t]}
                  {t}
                </button>
              ))}
            </div>

            <Field label="Subject" error={errors.subjectId}>
              <SubjectCombobox
                subjectType={subjectType}
                subjects={subjects}
                loading={loadingSubjects}
                value={selectedSubjectId}
                isNew={isNewSubject}
                newLabel={newSubjectLabel}
                newId={newSubjectId}
                onPickExisting={(id) => { setSelectedSubjectId(id); setIsNewSubject(false); setErrors((e) => ({ ...e, subjectId: '' })); }}
                onToggleNew={() => { setIsNewSubject((v) => !v); setSelectedSubjectId(''); }}
                onNewLabelChange={setNewSubjectLabel}
                onNewIdChange={setNewSubjectId}
                error={errors.subjectId}
              />
            </Field>
          </div>

          {/* Tool + source */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tool" hint="auto-detected" error={errors.tool}>
              <TextInput value={tool} onChange={setTool} placeholder="syft" error={!!errors.tool} />
            </Field>
            <Field label="Source" hint="optional">
              <TextInput value={source} onChange={setSource} placeholder="nginx:latest@sha256:…" />
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
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
            )}
          >
            {busy ? (
              <><Loader2 size={16} className="animate-spin" />
                {uploadState.status === 'validating' ? 'Validating…' : 'Uploading…'}</>
            ) : (
              <><Upload size={16} />Upload SBOM</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}