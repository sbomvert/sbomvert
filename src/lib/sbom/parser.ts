export type SbomFormat = 'spdx' | 'cyclonedx' | 'unknown';

export function detectSbomFormatDetailed(sbomString: string): SbomFormat {
  try {
    const parsed = JSON.parse(sbomString);

    if (parsed?.bomFormat === 'CycloneDX') {
      return 'cyclonedx';
    }

    if (parsed?.spdxVersion?.startsWith('SPDX-')) {
      return 'spdx';
    }

    return 'unknown';
  } catch (error: any) {
    return 'unknown';
  }
}
