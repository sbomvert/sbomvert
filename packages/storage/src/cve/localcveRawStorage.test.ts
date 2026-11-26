import { vol } from 'memfs';
import { LocalCVEService } from './localcveStorageService';

// in-memory files, as the other local storage tests use
jest.mock('fs', () => require('memfs').fs);

describe('LocalCVEService.saveRawCVEFile', () => {
  beforeEach(() => vol.reset());

  test('writes the scanner output under the raw folder, not beside the reports', async () => {
    const service = new LocalCVEService('/reports', 20, '/raw');

    await service.saveRawCVEFile('alpinetwodots3.22', 'spdx', 'grype', '{"matches":[]}');

    expect(vol.readFileSync('/raw/alpinetwodots3.22/grype.spdx.json', 'utf8')).toBe('{"matches":[]}');
    expect(vol.existsSync('/reports/alpinetwodots3.22')).toBe(false);
  });

  test('refuses a name that could leave the raw folder', async () => {
    const service = new LocalCVEService('/reports', 20, '/raw');

    await expect(service.saveRawCVEFile('..', 'spdx', 'grype', 'x')).rejects.toThrow();
  });
});
