import { Check, Copy, X } from "lucide-react";
import { useState } from "react";

const LABEL = { idle: "Copy", copied: "Copied", failed: "Copy failed" } as const;

export function CopyButton({ value }: { value: string }) {
  const [state, setState] = useState<keyof typeof LABEL>("idle");
  const show = (next: keyof typeof LABEL) => {
    setState(next);
    setTimeout(() => setState("idle"), 1500);
  };

  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => show("copied"), () => show("failed"))}
      // the icon stays small in dense rows; the ::before extends the tap target to 44px
      className="relative p-1 rounded text-foreground-subtle hover:bg-muted hover:text-foreground transition-colors before:absolute before:-inset-3 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={LABEL[state]}
      title={LABEL[state]}
    >
      {state === "copied" ? (
        <Check size={12} className="text-success-fg" aria-hidden />
      ) : state === "failed" ? (
        <X size={12} className="text-error-fg" aria-hidden />
      ) : (
        <Copy size={12} aria-hidden />
      )}
      {/* announced: the label change alone is not read out */}
      <span role="status" className="sr-only">{state === "idle" ? "" : LABEL[state]}</span>
    </button>
  );
}
