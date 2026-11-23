'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { toolColor } from '@/lib/utils';

// The comparison of docker:29.9.3 from public/sbom, as the compare page computes it (compareMultipleTools).
// ponytail: copied by hand, update it when that image's SBOMs are regenerated
const PREVIEW = {
  image: 'docker:29.9.3',
  total: 600,
  common: 51,
  tools: [
    ['Inspector-sbomgen (CDX)', 525],
    ['SCALIBR (SPDX)', 510],
    ['Docker-scout (SPDX)', 467],
    ['Docker-scout (CDX)', 466],
    ['Trivy (SPDX)', 463],
    ['Syft (SPDX)', 455],
    ['Syft (CDX)', 454],
    ['Trivy (CDX)', 453],
    ['Microsoft.SBOMTool (SPDX)', 54],
  ] as const,
};

const primaryAction =
  'inline-flex items-center h-11 px-5 rounded-button bg-primary text-primary-foreground text-body-sm font-medium transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const secondaryAction =
  'inline-flex items-center h-11 px-5 rounded-button border border-border bg-surface text-foreground text-body-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function HomePage() {
  const isStatic = FEATURE_FLAGS.STATIC_MODE;

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center lg:min-h-[70vh] py-8 lg:py-0">
      <title>SBOMVert</title>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-body-sm font-medium text-foreground-muted mb-3">SBOMVert</p>
        <h1 className="text-display sm:text-display-lg text-foreground text-balance mb-5">
          {isStatic
            ? 'Analyze and translate SBOMs in your browser'
            : 'See what each SBOM tool finds in the same container image'}
        </h1>
        <p className="text-body sm:text-heading-sm sm:font-normal text-foreground-muted max-w-xl mb-8">
          {isStatic ? (
            <>
              Open an SBOM to list its packages, or translate it between tools and between SPDX and CycloneDX.
              <span className="block mt-2 text-body-sm text-foreground-subtle">PS: they never leave your browser</span>
            </>
          ) : (
            'Syft, Trivy, Docker Scout and others list different packages and CVEs for one image. SBOMVert puts their reports side by side.'
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          {isStatic ? (
            <>
              <Link href="/compare/analyze" className={primaryAction}>SBOM Analysis</Link>
              <Link href="/translate" className={secondaryAction}>Translate SBOM</Link>
            </>
          ) : (
            <>
              <Link href="/compare" className={primaryAction}>Compare SBOMs</Link>
              <Link href="/compare/analyze" className={secondaryAction}>Analyze one SBOM</Link>
            </>
          )}
        </div>
      </motion.div>

      {/* the product's own result: how far apart the tools are on one real image */}
      <motion.figure
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="bg-surface rounded-card border border-border shadow-card p-card-p-lg min-w-0"
      >
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <span className="font-mono text-body-sm text-foreground truncate">{PREVIEW.image}</span>
          <span className="font-mono text-caption text-foreground-subtle shrink-0">{PREVIEW.tools.length} SBOMs</span>
        </div>
        <ol className="space-y-2.5" aria-label="Packages found by each tool">
          {PREVIEW.tools.map(([tool, count], i) => (
            <li key={tool} className={`items-center gap-3 text-caption ${i >= 5 ? 'hidden sm:flex' : 'flex'}`}>
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: toolColor(tool) }} aria-hidden />
              <span className="w-44 truncate text-foreground-muted">{tool}</span>
              <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${(count / PREVIEW.total) * 100}%`, backgroundColor: toolColor(tool) }} />
              </span>
              <span className="w-8 text-right font-mono text-foreground tabular-nums">{count}</span>
            </li>
          ))}
        </ol>
        <figcaption className="mt-5 pt-4 border-t border-border text-body-sm text-foreground-muted">
          <span className="text-foreground font-medium tabular-nums">{PREVIEW.common}</span> of{' '}
          <span className="tabular-nums">{PREVIEW.total}</span> packages are found by every tool
        </figcaption>
      </motion.figure>
    </div>
  );
}
