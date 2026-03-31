import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, ChevronRight, AlertTriangle } from 'lucide-react';
import { parsePurl } from '@/lib/parseSbom';

interface PurlAnalysisCardProps {
  purl?: string;
  cpe?: string;
}

export const PurlAnalysisCard: React.FC<PurlAnalysisCardProps> = ({ purl, cpe }) => {
  const [expanded, setExpanded] = useState(false);
  const parsed = parsePurl(purl);

  if (!purl && !cpe) {
    return (
      <div className="bg-surface-alt rounded-panel p-4 text-body-sm">
        <div className="flex items-center gap-2 text-foreground-muted">
          <AlertTriangle size={16} />
          <span>No pURL or CPE available</span>
        </div>
      </div>
    );
  }

  // Semantic colour classes for purl component badges
  const badgeClasses: Record<string, string> = {
    scheme:    'bg-info-subtle text-info-fg',
    type:      'bg-info-subtle text-info-fg',
    namespace: 'bg-success-subtle text-success-fg',
    name:      'bg-warning-subtle text-warning-fg',
    version:   'bg-warning-subtle text-warning-fg',
    default:   'bg-surface-alt text-foreground',
  };
  const badge = (key: string) => badgeClasses[key] ?? badgeClasses.default;

  return (
    <div className="bg-surface-alt rounded-panel p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-body-sm font-medium text-foreground-muted mb-2"
      >
        <span className="flex items-center gap-2">
          <Code size={16} />
          Package Identifiers
        </span>
        <ChevronRight
          size={16}
          className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3"
          >
            {parsed && (
              <div className="space-y-2">
                <div className="text-caption font-semibold text-foreground-muted">pURL Components:</div>
                <div className="grid grid-cols-2 gap-2 text-caption">
                  {(['scheme', 'type'] as const).map(k =>
                    parsed[k] && (
                      <div key={k}>
                        <span className="text-foreground-subtle capitalize">{k}:</span>
                        <span className={`ml-2 px-2 py-0.5 ${badge(k)} rounded font-mono`}>{parsed[k]}</span>
                      </div>
                    )
                  )}
                  {parsed.namespace && (
                    <div>
                      <span className="text-foreground-subtle">Namespace:</span>
                      <span className={`ml-2 px-2 py-0.5 ${badge('namespace')} rounded font-mono`}>{parsed.namespace}</span>
                    </div>
                  )}
                  {parsed.name && (
                    <div>
                      <span className="text-foreground-subtle">Name:</span>
                      <span className={`ml-2 px-2 py-0.5 ${badge('name')} rounded font-mono`}>{parsed.name}</span>
                    </div>
                  )}
                  {parsed.version && (
                    <div>
                      <span className="text-foreground-subtle">Version:</span>
                      <span className={`ml-2 px-2 py-0.5 ${badge('version')} rounded font-mono`}>{parsed.version}</span>
                    </div>
                  )}
                  {parsed.qualifiers &&
                    Object.entries(parsed.qualifiers).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-foreground-subtle">{k}:</span>
                        <span className={`ml-2 px-2 py-0.5 ${badge('default')} rounded font-mono`}>{v}</span>
                      </div>
                    ))}
                </div>
                <div className="bg-surface rounded p-2 font-mono text-caption break-all text-foreground">{purl}</div>
              </div>
            )}

            {cpe && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-caption font-semibold text-foreground-muted">CPE:</div>
                <div className="bg-surface rounded p-2 font-mono text-caption break-all text-foreground">{cpe}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
