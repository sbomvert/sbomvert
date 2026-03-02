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
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <AlertTriangle size={16} />
          <span>No pURL or CPE available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  pURL Components:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Scheme:</span>
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded font-mono">
                      {parsed.scheme}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded font-mono">
                      {parsed.type}
                    </span>
                  </div>
                  {parsed.namespace && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Namespace:</span>
                      <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded font-mono">
                        {parsed.namespace}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Name:</span>
                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded font-mono">
                      {parsed.name}
                    </span>
                  </div>
                  {parsed.version && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Version:</span>
                      <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded font-mono">
                        {parsed.version}
                      </span>
                    </div>
                  )}
                  {parsed.qualifiers &&
                    Object.entries(parsed.qualifiers).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded font-mono">
                          {value}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-xs break-all">
                  {purl}
                </div>
              </div>
            )}

            {cpe && (
              <div className="space-y-2 pt-2 border-t dark:border-gray-600">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">CPE:</div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-xs break-all">
                  {cpe}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
