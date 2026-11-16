'use client';
import { useEffect, useMemo, useState } from 'react';
import { CycloneDxBom } from '@sbomvert/core/cyclonedx/types';
import { SpdxDocument } from '@sbomvert/core/spdx/types';
import { detectTool, formatOf, SbomFormat, ToolId } from '@sbomvert/core/translate/detectTool';
import { sourceTools, translateSbom, translateTargets } from '@sbomvert/core/translate/translateSbom';
import { formatContainerName, reverseFormatContainerName } from '@/lib/container/containerUtils';
import { PageTitle } from '@/components/Title/Title';
import { Card } from '@/components/card/Card';
import { Button } from '@/components/button/Button';
import { cn } from '@/lib/utils';
import { FileUp } from 'lucide-react';

const LABELS: Record<ToolId, string> = {
  anchore: 'Syft',
  trivy: 'Trivy',
  docker: 'Docker Scout',
  google: 'Google',
  amazon: 'Amazon Inspector',
  microsoft: 'Microsoft',
};
// the tool's name in SBOM file names (`syft.cdx.json`)
const FILE_IDS: Partial<Record<ToolId, string>> = { anchore: 'syft', docker: 'scout' };
const FORMAT_LABELS: Record<SbomFormat, string> = { spdx: 'SPDX', cdx: 'CycloneDX' };

type Input = { doc: SpdxDocument | CycloneDxBom; format: SbomFormat; name: string; detected?: ToolId };
type Container = { name: string; files: { name: string }[] };

const selectClass = 'w-full rounded-input border border-border px-3 py-2 text-body-sm bg-surface text-foreground disabled:opacity-60';
const labelClass = 'block text-body-sm font-medium text-foreground-muted mb-1';

// The input SBOM: JSON, SPDX or CycloneDX, with the tool that made it when it says so
const readSbom = (text: string, name: string): Input => {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON');
  }
  const format = formatOf(doc);
  if (!format) throw new Error('Not an SPDX or CycloneDX SBOM');
  const sbom = doc as SpdxDocument | CycloneDxBom;
  const detected = detectTool(sbom);
  return { doc: sbom, format, name, detected: detected && sourceTools(format).includes(detected) ? detected : undefined };
};

const download = (fileName: string, doc: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // some browsers cancel a download whose URL is revoked before it starts
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function TranslatePage() {
  const [mode, setMode] = useState<'file' | 'stored'>('file');
  const [input, setInput] = useState<Input | null>(null);
  const [source, setSource] = useState<ToolId | ''>('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [containers, setContainers] = useState<Container[]>([]);
  const [image, setImage] = useState('');
  const [storedFile, setStoredFile] = useState('');
  const [fileName, setFileName] = useState('');

  // by tool name; the sort is stable, so each tool keeps SPDX before CycloneDX
  const targets = useMemo(
    () => (input && source ? translateTargets({ tool: source, format: input.format }).sort((a, b) => LABELS[a.tool].localeCompare(LABELS[b.tool])) : []),
    [input, source],
  );
  const targetValue = targets.some(t => `${t.tool}:${t.format}` === target) ? target : '';

  const load = (next: Input) => {
    setInput(next);
    setSource(next.detected ?? '');
    setTarget('');
    setError('');
  };
  const fail = (message: string) => {
    setInput(null);
    setSource('');
    setError(message);
  };

  // the other mode's input, selection and error go: what is translated is what the page shows
  const switchMode = (next: 'file' | 'stored') => {
    setMode(next);
    setInput(null);
    setSource('');
    setTarget('');
    setError('');
    setImage('');
    setStoredFile('');
    setSearch('');
    setFileName('');
  };

  // what the user types in the Image field: an image once it names one, a search until then
  const onImageTyped = (text: string) => {
    setSearch(text);
    const typed = containers.find(c => formatContainerName(c.name) === text)?.name ?? '';
    if (typed !== image) {
      setImage(typed);
      setStoredFile('');
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    try {
      load(readSbom(await file.text(), file.name.replace(/(\.(spdx|cdx|cyclonedx|bom))?\.json$/i, '')));
    } catch (err) {
      fail((err as Error).message);
    }
  };

  // the stored images, narrowed by the search (the first page only). Folders are named with the image encoded
  // (`alpinetwodots3.24.4`), so the search is too; a reply to an older search is dropped.
  useEffect(() => {
    if (mode !== 'stored') return;
    let current = true;
    // the typed name selects the image it is, once the list has it
    const show = (list: Container[]) => {
      if (!current) return;
      setContainers(list);
      const typed = list.find(c => formatContainerName(c.name) === search)?.name ?? '';
      if (typed !== image) {
        setImage(typed);
        setStoredFile('');
      }
    };
    fetch(`/api/sbom-files?page=1&search=${encodeURIComponent(reverseFormatContainerName(search))}`)
      .then(res => (res.ok ? res.json() : { containers: [] }))
      .then(data => show(data.containers ?? []))
      .catch(() => show([]));
    return () => {
      current = false;
    };
    // the image is only read to keep it: choosing one must not search again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, search]);

  useEffect(() => {
    if (mode !== 'stored' || !image || !storedFile) return;
    // a response for an image, file or mode the user has since left is dropped
    let current = true;
    fetch(`/api/sbom/${image}/${storedFile}`)
      .then(async res => {
        if (!res.ok) throw new Error(`Could not load ${storedFile} (${res.status})`);
        return res.text();
      })
      .then(text => current && load(readSbom(text, formatContainerName(image).replace(/[:/]/g, '-'))))
      .catch(err => current && fail((err as Error).message));
    return () => {
      current = false;
    };
  }, [mode, image, storedFile]);

  const translate = () => {
    if (!input || !source || !targetValue) return;
    const [tool, format] = targetValue.split(':') as [ToolId, SbomFormat];
    try {
      const out = translateSbom(input.doc, { tool: source, format: input.format }, { tool, format });
      download(`${input.name}.${FILE_IDS[tool] ?? tool}.${format}.json`, out);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const files = containers.find(c => c.name === image)?.files ?? [];

  return (
    <>
      <PageTitle title="Translate SBOM" subtitle="Convert an SBOM to the output of another tool or format." />

      <Card className="flex flex-col gap-5 max-w-2xl">
        <fieldset className="flex flex-col gap-3">
          <legend className={labelClass}>Source</legend>
          <div className="flex gap-6 text-body-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === 'file'} onChange={() => switchMode('file')} />
              File from my computer
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === 'stored'} onChange={() => switchMode('stored')} />
              Stored SBOM
            </label>
          </div>

          {mode === 'file' ? (
            <div>
              <label htmlFor="translate-file" className={labelClass}>File</label>
              {/* the native input is hidden; its label is the button */}
              <input
                id="translate-file"
                type="file"
                accept=".json,application/json"
                className="peer sr-only"
                onChange={e => onFile(e.target.files?.[0])}
              />
              <div className="flex items-center gap-3">
                <label
                  htmlFor="translate-file"
                  className="inline-flex items-center gap-2 rounded-button border-2 border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-button cursor-pointer hover:bg-primary-hover peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                >
                  <FileUp size={16} />
                  Choose a JSON file
                </label>
                <span className="text-body-sm text-foreground-muted truncate">{fileName || 'No file chosen'}</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="translate-image" className={labelClass}>Image</label>
                {/* typing suggests the stored images that match; picking one fills it in */}
                <input
                  id="translate-image"
                  list="translate-images"
                  autoComplete="off"
                  className={selectClass}
                  value={search}
                  onChange={e => onImageTyped(e.target.value)}
                  placeholder="Type an image, e.g. alpine:3.24"
                />
                <datalist id="translate-images">
                  {containers.map(c => <option key={c.name} value={formatContainerName(c.name)} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="translate-stored" className={labelClass}>Stored file</label>
                <select id="translate-stored" className={selectClass} value={storedFile} disabled={!image} onChange={e => setStoredFile(e.target.value)}>
                  <option value="">Choose a file</option>
                  {files.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="translate-source" className={labelClass}>From</label>
            <select id="translate-source" className={selectClass} value={source} disabled={!input} onChange={e => setSource(e.target.value as ToolId | '')}>
              <option value="">Choose the tool</option>
              {input && sourceTools(input.format).map(t => <option key={t} value={t}>{`${LABELS[t]} · ${FORMAT_LABELS[input.format]}`}</option>)}
            </select>
            {input && (
              <p className="text-caption text-foreground-subtle mt-1">
                {input.detected && source === input.detected ? 'Tool detected' : input.detected ? '' : 'Tool not detected: choose it'}
              </p>
            )}
            {input?.detected && source && source !== input.detected && (
              <p className="text-caption text-warning-fg mt-1">
                Not the detected tool ({LABELS[input.detected]}): if the SBOM wasn&apos;t made by {LABELS[source]}, the translation will be wrong.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="translate-target" className={labelClass}>Translate to</label>
            <select id="translate-target" className={selectClass} value={targetValue} disabled={!targets.length} onChange={e => setTarget(e.target.value)}>
              <option value="">Choose a target</option>
              {targets.map(t => (
                <option key={`${t.tool}:${t.format}`} value={`${t.tool}:${t.format}`}>{`${LABELS[t.tool]} · ${FORMAT_LABELS[t.format]}`}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className={cn('text-body-sm rounded-input border border-danger px-3 py-2 text-danger')}>
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={translate} disabled={!input || !source || !targetValue}>
            Translate &amp; download
          </Button>
        </div>
      </Card>
    </>
  );
}
