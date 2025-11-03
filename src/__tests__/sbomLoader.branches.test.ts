import { loadSbomsFromPublic } from '@/lib/sbomLoader';
import { parseSpdxSbom, parseCycloneDxSbom } from '@/lib/parseSbom';

jest.mock('@/lib/parseSbom');

describe('loadSbomsFromPublic branches', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    jest.resetAllMocks();
  });

  it('handles per-file non-ok fetch gracefully', async () => {
    // list ok
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        containers: [
          {
            name: 'redis-twodotslatest',
            files: [{ name: 'syft.spdx' }, { name: 'trivy.cyclonedx' }, { name: 'bad.spdx' }],
          },
        ],
      }),
    });
    // syft file ok
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // cyclonedx file ok
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // bad file non-ok
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    (parseSpdxSbom as jest.Mock).mockReturnValueOnce({
      format: 'SPDX',
      tool: 'Syft',
      toolInfo: { name: 'Syft', version: '1.0.0', vendor: 'Anchore', format: 'SPDX' },
      imageId: 'redis:latest',
      packages: [],
      timestamp: 't',
    });
    (parseCycloneDxSbom as jest.Mock).mockReturnValueOnce(null);

    const { images, sboms } = await loadSbomsFromPublic();
    expect(images[0].id).toBe('redis:latest');
    expect(sboms['redis:latest']).toHaveLength(1);
  });
});


