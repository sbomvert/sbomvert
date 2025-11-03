import { loadSbomsFromPublic } from '@/lib/sbomLoader';
import { parseSpdxSbom, parseCycloneDxSbom } from '@/lib/parseSbom';

jest.mock('@/lib/parseSbom');

describe('loadSbomsFromPublic', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    jest.resetAllMocks();
  });

  it('returns images and sboms for valid response', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        containers: [
          {
            name: 'nginx-twodotslatest',
            files: [{ name: 'syft.spdx' }],
          },
        ],
      }),
    });
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ spdxVersion: 'SPDX-2.3', creationInfo: { creators: ['Tool: syft-1.0.0', 'Organization: Anchore'], created: 'd' }, packages: [] }),
    });
    (parseSpdxSbom as jest.Mock).mockReturnValue({
      format: 'SPDX',
      tool: 'Syft',
      toolInfo: { name: 'Syft', version: '1.0.0', vendor: 'Anchore', format: 'SPDX' },
      imageId: 'nginx:latest',
      packages: [],
      timestamp: 'd',
    });
    (parseCycloneDxSbom as jest.Mock).mockReturnValue(null);

    const { images, sboms } = await loadSbomsFromPublic();
    expect(images).toHaveLength(1);
    expect(images[0].id).toBe('nginx:latest');
    expect(sboms['nginx:latest']).toHaveLength(1);
  });

  it('handles non-ok fetch gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: false });
    const res = await loadSbomsFromPublic();
    expect(res.images).toEqual([]);
    expect(res.sboms).toEqual({});
  });
});


