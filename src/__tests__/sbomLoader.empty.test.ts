import { loadSbomsFromPublic } from '@/lib/sbomLoader';

describe('loadSbomsFromPublic skips empty containers', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  it('does not add image when no SBOMs parsed', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ containers: [{ name: 'ubuntu-twodots20dash04', files: [{ name: 'unknown.txt' }] }] }),
    });
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    const { images, sboms } = await loadSbomsFromPublic();
    expect(images).toHaveLength(0);
    expect(Object.keys(sboms)).toHaveLength(0);
  });
});


