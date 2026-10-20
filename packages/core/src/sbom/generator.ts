// How each tool produces its SBOMs. The scan worker has no Docker daemon, so every tool pulls the
// image from its registry itself. Each format is written to a file in `outDir`: syft writes both
// in one run (one image pull); trivy and scout need a run per format.
// Only the vulnerability databases are cached (worker/src/index.ts downloads them; runs never update
// them). Trivy's per-layer analysis stays in memory, so nothing about images is kept between runs.
// Trivy needs its Java DB even for SBOMs, to identify JAR files.

export type SbomFormat = 'spdx' | 'cdx';
export type SbomPlan = {
  runs: { cmd: string; args: string[] }[];
  outputs: Record<SbomFormat, string>; // where each format ends up
};

export function GenerateSBOMsWithTool(
  tool: string,
  image: string,
  outDir: string
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
              '-o',
              `spdx-json=${outputs.spdx}`,
              '-o',
              `cyclonedx-json=${outputs.cdx}`,
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
          '--format',
          format,
          '--output',
          file,
          image,
        ],
      });
      return { runs: [trivy('spdx-json', outputs.spdx), trivy('cyclonedx', outputs.cdx)], outputs };
    }
    case 'scout': {
      const scout = (format: string, file: string) => ({
        cmd: 'docker',
        args: ['scout', 'sbom', `registry://${image}`, `--format=${format}`, '--output', file],
      });
      return { runs: [scout('spdx', outputs.spdx), scout('cyclonedx', outputs.cdx)], outputs };
    }
    default:
      return null;
  }
}
