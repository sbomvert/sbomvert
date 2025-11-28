import { LocalSbomService } from '@/services/sbomStorageService/localSbomService';
import { ISbomService } from '@/services/sbomStorageService/sbomService.types';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

describe('SbomService', () => {
  let service: ISbomService;
  const testDir = '/test/sbom/dir';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocalSbomService(testDir);
  });

  describe('listSboms', () => {
    it('should list SBOM files with pagination', async () => {
      // Mock container directories
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([
          { name: 'container1', isDirectory: () => true, isFile: () => false },
          { name: 'container2', isDirectory: () => true, isFile: () => false },
        ])
        .mockReturnValueOnce([
          { name: 'syft.spdx.json', isDirectory: () => false, isFile: () => true },
          { name: 'trivy.spdx.json', isDirectory: () => false, isFile: () => true },
        ])
        .mockReturnValueOnce([
          { name: 'syft.spdx.json', isDirectory: () => false, isFile: () => true },
          { name: 'trivy.spdx.json', isDirectory: () => false, isFile: () => true },
        ]);

      const result = await service.listSboms(1);

      // Verify correct fs calls
      expect(fs.existsSync).toHaveBeenCalledWith(testDir);
      expect(fs.readdirSync).toHaveBeenCalledWith(testDir, { withFileTypes: true });
      expect(fs.readdirSync).toHaveBeenCalledWith(path.join(testDir, 'container1'), {
        withFileTypes: true,
      });
      expect(fs.readdirSync).toHaveBeenCalledWith(path.join(testDir, 'container2'), {
        withFileTypes: true,
      });

      // Verify result structure
      expect(result.containers).toHaveLength(2);
      expect(result.containers[0].name).toBe('container1');
      expect(result.containers[0].files).toHaveLength(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should handle missing SBOM directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.listSboms(1);

      expect(fs.existsSync).toHaveBeenCalledWith(testDir);
      expect(fs.readdirSync).not.toHaveBeenCalled();
      expect(result.containers).toEqual([]);
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
      });
    });

    it('should filter containers by search term', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([
          { name: 'python-3.9', isDirectory: () => true, isFile: () => false },
          { name: 'nginx-1.21', isDirectory: () => true, isFile: () => false },
        ])
        .mockReturnValueOnce([
          { name: 'syft.spdx.json', isDirectory: () => false, isFile: () => true },
        ]);

      const searchTerm = 'python';
      const result = await service.listSboms(1, searchTerm);

      expect(fs.readdirSync).toHaveBeenCalledWith(testDir, { withFileTypes: true });
      expect(result.containers).toHaveLength(1);
      expect(result.containers[0].name).toBe('python-3.9');
    });

    it('should normalize invalid page numbers', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'container1', isDirectory: () => true, isFile: () => false },
      ]);

      const result = await service.listSboms(-1);

      expect(result.pagination.currentPage).toBe(1);
      expect(result.containers).not.toHaveLength(0);
    });

    it('should handle file system errors', () => {
      const errorMessage = 'File system error';
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      expect(() => service.listSboms(1)).toThrow('File system error');
    });
  });
  const mockDirents = [
    { name: 'nginx-twodotslatest', isDirectory: () => true, isFile: () => false },
    { name: 'python-twodots3.9', isDirectory: () => true, isFile: () => false },
    { name: 'not-a-dir', isDirectory: () => false, isFile: () => true },
  ];

  const mockFiles = [
    { name: 'syft.spdx.json', isDirectory: () => false, isFile: () => true },
    { name: 'trivy.spdx.json', isDirectory: () => false, isFile: () => true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listSboms', () => {
    it('lists containers and their SBOM files', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation((p: unknown) => {
        if (
          typeof p === 'string' &&
          (p.endsWith('nginx-twodotslatest') || p.endsWith('python-twodots3.9'))
        ) {
          return mockFiles;
        }
        return mockDirents;
      });

      const result = await service.listSboms(1);

      expect(result.containers).toHaveLength(2);
      expect(result.containers[0].name).toBe('nginx-twodotslatest');
      expect(result.containers[0].files).toHaveLength(2);
      expect(result.containers[0].files[0].name).toBe('syft.spdx.json');
      expect(result.pagination.currentPage).toBe(1);
    });

    it('handles missing SBOM directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.listSboms(1);

      expect(result.containers).toEqual([]);
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
      });
    });

    it('paginates results correctly', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(
        Array.from({ length: 10 }, (_, i) => ({
          name: `container-${i}`,
          isDirectory: () => true,
          isFile: () => false,
        }))
      );

      const page1 = await service.listSboms(1);
      const page2 = await service.listSboms(2);

      expect(page1.containers).toHaveLength(8);
      expect(page2.containers).toHaveLength(2);
      expect(page1.pagination.totalPages).toBe(2);
      expect(page2.pagination.currentPage).toBe(2);
    });

    it('filters containers by search term', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'nginx-1.0', isDirectory: () => true, isFile: () => false },
        { name: 'python-3.9', isDirectory: () => true, isFile: () => false },
        { name: 'node-16', isDirectory: () => true, isFile: () => false },
      ]);

      const result = await service.listSboms(1, 'python');

      expect(result.containers).toHaveLength(1);
      expect(result.containers[0].name).toBe('python-3.9');
    });

    it('normalizes invalid page numbers', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(mockDirents);

      const result = await service.listSboms(-1);

      expect(result.pagination.currentPage).toBe(1);
      expect(result.containers).not.toHaveLength(0);
    });

    it('handles file system errors', () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });

      expect(async () => await service.listSboms(1)).toThrow('File system error');
    });
  });
});
