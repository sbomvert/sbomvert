import React, { useState } from 'react';
import { FileUp } from 'lucide-react';

interface FilePickerProps {
  id: string;
  // the chosen file's name
  fileName?: string;
  accept?: string;
  onFile: (file?: File) => void;
}

// A file input shown as a drop zone with the chosen file's name. The native input is hidden; its label is the zone,
// right after it so its focus shows on the zone (peer-*). A file can also be dropped on it.
export const FilePicker: React.FC<FilePickerProps> = ({ id, fileName, accept = '.json,application/json', onFile }) => {
  const [over, setOver] = useState(false);

  return (
    <div>
      <input
        id={id}
        type="file"
        accept={accept}
        className="peer sr-only"
        onChange={e => {
          onFile(e.target.files?.[0]);
          // the same file can be chosen again (e.g. after the form is cleared)
          e.target.value = '';
        }}
      />
      <label
        htmlFor={id}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center justify-center gap-1 h-32 px-4 rounded-input border border-dashed text-body-sm cursor-pointer transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${
          over ? 'border-primary-fg bg-muted' : 'border-border-field bg-surface-alt hover:bg-muted'
        }`}
      >
        <FileUp size={18} className="text-foreground-subtle mb-1" aria-hidden />
        <span className="text-foreground-muted">
          <span className="font-medium text-foreground">Choose a JSON file</span> or drop it here
        </span>
        <span className="max-w-full font-mono text-caption text-foreground-subtle truncate">{fileName || 'No file chosen'}</span>
      </label>
    </div>
  );
};
