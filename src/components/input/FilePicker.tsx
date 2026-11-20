import React from 'react';
import { FileUp } from 'lucide-react';

interface FilePickerProps {
  id: string;
  // the chosen file's name
  fileName?: string;
  accept?: string;
  onFile: (file?: File) => void;
}

// A file input shown as a button and the chosen file's name. The native input is hidden; its label is the button,
// right after it so its focus shows on the button (peer-*)
export const FilePicker: React.FC<FilePickerProps> = ({ id, fileName, accept = '.json,application/json', onFile }) => (
  <div className="flex items-center gap-3">
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
      className="inline-flex items-center gap-2 rounded-button border-2 border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-button cursor-pointer hover:bg-primary-hover peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
    >
      <FileUp size={16} />
      Choose a JSON file
    </label>
    <span className="text-body-sm text-foreground-muted truncate">{fileName || 'No file chosen'}</span>
  </div>
);
