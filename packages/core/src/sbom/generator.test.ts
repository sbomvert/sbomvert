import { GenerateSBOMsWithTool } from './generator';

const OUT = '/tmp/scan-x';

test('syft writes SPDX and CycloneDX in a single run, so the image is pulled once', () => {
  expect(GenerateSBOMsWithTool('syft', 'nginx:1.27', OUT)).toStrictEqual({
    runs: [
      {
        cmd: 'syft',
        args: [
          'registry:nginx:1.27',
          '-o',
          `spdx-json=${OUT}/syft.spdx.json`,
          '-o',
          `cyclonedx-json=${OUT}/syft.cdx.json`,
        ],
      },
    ],
    outputs: { spdx: `${OUT}/syft.spdx.json`, cdx: `${OUT}/syft.cdx.json` },
  });
});

test('trivy pulls from the registry, never updates its databases, keeps no layer cache, one run per format', () => {
  const plan = GenerateSBOMsWithTool('trivy', 'nginx:1.27', OUT)!;
  expect(plan.runs).toStrictEqual([
    {
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
        'spdx-json',
        '--output',
        `${OUT}/trivy.spdx.json`,
        'nginx:1.27',
      ],
    },
    {
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
        'cyclonedx',
        '--output',
        `${OUT}/trivy.cdx.json`,
        'nginx:1.27',
      ],
    },
  ]);
  expect(plan.outputs).toStrictEqual({
    spdx: `${OUT}/trivy.spdx.json`,
    cdx: `${OUT}/trivy.cdx.json`,
  });
});

test('scout reads the image from the registry, one run per format', () => {
  expect(GenerateSBOMsWithTool('scout', 'nginx', OUT)!.runs).toStrictEqual([
    {
      cmd: 'docker',
      args: [
        'scout',
        'sbom',
        'registry://nginx',
        '--format=spdx',
        '--output',
        `${OUT}/scout.spdx.json`,
      ],
    },
    {
      cmd: 'docker',
      args: [
        'scout',
        'sbom',
        'registry://nginx',
        '--format=cyclonedx',
        '--output',
        `${OUT}/scout.cdx.json`,
      ],
    },
  ]);
});

test('returns null for a tool that cannot produce SBOMs', () => {
  expect(GenerateSBOMsWithTool('grype', 'nginx', OUT)).toBeNull();
});
