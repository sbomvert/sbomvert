import { vol } from 'memfs';
import path from 'path';
import { LocalCVEService } from './localcveStorageService';

jest.mock('fs', () => require('memfs').fs);

const root = '/testData';
const service = new LocalCVEService(root);

describe('names from a request cannot leave the CVE directory', () => {
  beforeEach(() => {
    vol.reset();
    vol.mkdirSync('/secret', { recursive: true });
    vol.writeFileSync('/secret/key.json', '{"secret":true}');
    vol.mkdirSync(path.join(root, 'app'), { recursive: true });
    vol.writeFileSync(path.join(root, 'app', 'grype.json'), '{}');
  });

  test('a stored report is read', async () => {
    expect(await service.getFileContent('app', 'grype.json')).toBe('{}');
  });

  test('getFileContent', async () => {
    await expect(service.getFileContent('..', 'secret/key.json')).rejects.toThrow();
    await expect(service.getFileContent('app', '../../secret/key.json')).rejects.toThrow();
  });

  test('listCVEFiles', async () => {
    expect(await service.listCVEFiles('../secret')).toEqual([]);
  });

  test('saveCVEFile', async () => {
    await expect(service.saveCVEFile('../secret', 'json', 'grype', '{}')).rejects.toThrow('Invalid name');
    expect(vol.readdirSync('/secret')).toEqual(['key.json']);
  });
});
