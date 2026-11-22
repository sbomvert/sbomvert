// How each tool produces its SBOMs. The scan worker has no Docker daemon, so every tool pulls the
// image from its registry itself. Each format is written to a file in `outDir`: syft writes both
// in one run (one image pull); trivy and scout need a run per format.
// Only the vulnerability databases are cached (worker/src/index.ts downloads them; runs never update
// them). Trivy's per-layer analysis stays in memory, so nothing about images is kept between runs.
// Trivy needs its Java DB even for SBOMs, to identify JAR files.

import { SBOM_FORMATS, SbomFormat } from '../tools';

export type { SbomFormat };
export type SbomPlan = {
  runs: { cmd: string; args: string[] }[];
  outputs: Record<SbomFormat, string>; // where each format ends up
};

// Downloads the image to a `docker save`-style file, for the tools that would otherwise ask a Docker daemon.
// skopeo follows /etc/containers/policy.json (from Alpine's containers-common).
const pullToArchive = (image: string, archive: string) => ({
  cmd: 'skopeo',
  args: ['copy', `docker://${image}`, `docker-archive:${archive}`],
});

export function GenerateSBOMsWithTool(
  tool: string,
  image: string,
  outDir: string,
  formats: readonly SbomFormat[] = SBOM_FORMATS
): SbomPlan | null {
  const outputs = { spdx: `${outDir}/${tool}.spdx.json`, cdx: `${outDir}/${tool}.cdx.json` };
  switch (tool) {
    case 'syft':
      return {
        runs: [
          {
            cmd: 'syft',
            args: [
              `registry:${image}`,
              ...(formats.includes('spdx') ? ['-o', `spdx-json=${outputs.spdx}`] : []),
              ...(formats.includes('cdx') ? ['-o', `cyclonedx-json=${outputs.cdx}`] : []),
            ],
          },
        ],
        outputs,
      };
    case 'trivy': {
      const trivy = (format: string, file: string) => ({
        cmd: 'trivy',
        args: [
          'image',
          '--image-src',
          'remote',
          '--skip-db-update',
          '--skip-java-db-update',
          '--cache-backend',
          'memory',
          '--timeout',
          '15m',
          '--format',
          format,
          '--output',
          file,
          image,
        ],
      });
      return {
        runs: [
          ...(formats.includes('spdx') ? [trivy('spdx-json', outputs.spdx)] : []),
          ...(formats.includes('cdx') ? [trivy('cyclonedx', outputs.cdx)] : []),
        ],
        outputs,
      };
    }
    case 'scout': {
      const scout = (format: string, file: string) => ({
        cmd: 'docker',
        args: ['scout', 'sbom', `registry://${image}`, `--format=${format}`, '--output', file],
      });
      return {
        runs: [
          ...(formats.includes('spdx') ? [scout('spdx', outputs.spdx)] : []),
          ...(formats.includes('cdx') ? [scout('cyclonedx', outputs.cdx)] : []),
        ],
        outputs,
      };
    }
    case 'amazon':
      // CycloneDX only: an SPDX request yields no file, which the worker reports as missing
      return {
        runs: formats.includes('cdx')
          ? [{ cmd: 'inspector-sbomgen', args: ['container', '--image', image, '--disable-progress-bar', '-o', outputs.cdx] }]
          : [],
        outputs,
      };
    case 'osv': {
      // exits with 1 when the packages have known vulnerabilities, after writing the SBOM
      const archive = `${outDir}/image.tar`;
      // SPDX only: its CycloneDX leaves out OS packages
      const osv = {
        cmd: 'osv-scanner',
        args: ['scan', 'image', '--archive', '--all-packages', '--format', 'spdx-2-3', '--output-file', outputs.spdx, archive],
      };
      return { runs: formats.includes('spdx') ? [pullToArchive(image, archive), osv] : [], outputs };
    }
    case 'cdxgen': {
      const archive = `${outDir}/image.tar`;
      return {
        runs: formats.includes('cdx')
          ? [pullToArchive(image, archive), { cmd: 'cdxgen', args: ['-t', 'docker', '-o', outputs.cdx, archive] }]
          : [],
        outputs,
      };
    }
    default:
      return null;
  }
}
