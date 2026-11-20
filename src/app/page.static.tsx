'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { toolColor } from '@/lib/utils';

// Real results for docker:29.9.3 from public/sbom, copied by hand.
// ponytail: update them when that image's SBOMs are regenerated
// The comparison of its 9 SBOMs, as the compare page computes it (compareMultipleTools)
const COMPARISON = {
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
// Syft's SPDX SBOM of it alone, as the analysis reads it (parseSbom): what the static build can show
const ANALYSIS = {
  total: 455,
  licensed: 54,
  types: [['golang', 401], ['apk', 53], ['oci', 1]] as const,
};

// one row of the preview: a label, a thin bar out of the total, the count
const Row = ({ label, count, total, color, dot, className = 'flex' }: { label: string; count: number; total: number; color: string; dot?: boolean; className?: string }) => (
  <li className={`items-center gap-3 text-caption ${className}`}>
    {dot && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />}
    <span className="w-44 truncate text-foreground-muted">{label}</span>
    <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
      <span className="block h-full rounded-full" style={{ width: `${(count / total) * 100}%`, backgroundColor: color }} />
    </span>
    <span className="w-8 text-right font-mono text-foreground tabular-nums">{count}</span>
  </li>
);

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

      {/* the product's own result on one real image */}
      <motion.figure
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="bg-surface rounded-card border border-border shadow-card p-card-p-lg min-w-0"
      >
        {isStatic ? (
          // the static build analyzes one SBOM: show what that gives
          <>
            <div className="flex items-baseline justify-between gap-4 mb-5">
              <span className="font-mono text-body-sm text-foreground truncate">docker:29.9.3 · syft.spdx.json</span>
              <span className="font-mono text-caption text-foreground-subtle shrink-0">SPDX 2.3</span>
            </div>
            <p className="text-caption text-foreground-subtle mb-3">Packages by type</p>
            <ol className="space-y-2.5" aria-label="Packages by type">
              {ANALYSIS.types.map(([type, count]) => (
                <Row key={type} label={type} count={count} total={ANALYSIS.total} color="var(--primary)" />
              ))}
            </ol>
            <figcaption className="mt-5 pt-4 border-t border-border text-body-sm text-foreground-muted">
              <span className="text-foreground font-medium tabular-nums">{ANALYSIS.licensed}</span> of{' '}
              <span className="tabular-nums">{ANALYSIS.total}</span> packages state a license
            </figcaption>
          </>
        ) : (
          // the full app compares tools: how far apart they are on one real image
          <>
            <div className="flex items-baseline justify-between gap-4 mb-5">
              <span className="font-mono text-body-sm text-foreground truncate">docker:29.9.3</span>
              <span className="font-mono text-caption text-foreground-subtle shrink-0">{COMPARISON.tools.length} SBOMs</span>
            </div>
            <ol className="space-y-2.5" aria-label="Packages found by each tool">
              {COMPARISON.tools.map(([tool, count], i) => (
                <Row key={tool} label={tool} count={count} total={COMPARISON.total} color={toolColor(tool)} dot className={i >= 5 ? 'hidden sm:flex' : 'flex'} />
              ))}
            </ol>
            <figcaption className="mt-5 pt-4 border-t border-border text-body-sm text-foreground-muted">
              <span className="text-foreground font-medium tabular-nums">{COMPARISON.common}</span> of{' '}
              <span className="tabular-nums">{COMPARISON.total}</span> packages are found by every tool
            </figcaption>
          </>
        )}
      </motion.figure>
    </div>
  );
}
