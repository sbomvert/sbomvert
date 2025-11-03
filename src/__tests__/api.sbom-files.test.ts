jest.mock('next/server', () => ({
  NextResponse: {
    json: (obj: any, init?: any) => ({ json: async () => obj, status: init?.status ?? 200 }),
  },
}));
import { GET } from '@/app/api/sbom-files/route';
import fs from 'fs';

jest.mock('fs');

describe('GET /api/sbom-files', () => {
  it('lists containers and files', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock)
      .mockReturnValueOnce([
        { isDirectory: () => true, name: 'nginx-twodotslatest' },
        { isDirectory: () => false, name: 'skip' },
      ])
      .mockReturnValueOnce([
        { isFile: () => true, name: 'syft.spdx.json' },
        { isFile: () => true, name: 'trivy.cyclonedx.json' },
      ]);

    const res = await GET();
    const json = await (res as any).json();
    expect(json.containers[0].name).toBe('nginx-twodotslatest');
    expect(json.containers[0].files).toHaveLength(2);
    expect(json.containers[0].files[0].path).toMatch('/sbom/nginx-twodotslatest/');
  });

  it('returns empty when dir missing', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const res = await GET();
    const json = await (res as any).json();
    expect(json.containers).toEqual([]);
  });
});


