import fs from 'fs';
import path from 'path';
import type { ISbomService, SbomFile, Container, SbomListResponse } from './sbomService.types';

/**
 * Local file system implementation of SBOM service
 */
export class LocalSbomService implements ISbomService {
  private readonly sbomDir: string;
  private readonly itemsPerPage: number;

  constructor(sbomDir: string, itemsPerPage: number = 20) {
    this.sbomDir = sbomDir;
    this.itemsPerPage = itemsPerPage;
  }
listFiles(containerName: string): Promise<SbomFile[]> {
  return Promise.resolve(this.getContainerFiles(containerName));
}


  private checkDirectoryExists(): boolean {
    return fs.existsSync(this.sbomDir);
  }

  private getContainerDirs(search?: string): string[] {
    const dirs = fs
      .readdirSync(this.sbomDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    if (search) {
      return dirs.filter(name => name.toLowerCase().includes(search.toLowerCase()));
    }
    return dirs;
  }

  private getContainerFiles(containerName: string): SbomFile[] {
    const containerPath = path.join(this.sbomDir, containerName);

    try {
      return fs
        .readdirSync(containerPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
        .map(dirent => {
          const filePath = path.join(containerPath, dirent.name);
          const stats = fs.statSync(filePath);
          return {
            name: dirent.name,
            path: `/sbom/${containerName}/${dirent.name}`,
            size: stats.size,
            lastModified: stats.mtime,
          };
        });
    } catch (error) {
      console.error(`Error reading container ${containerName}:`, error);
      return [];
    }
  }

  async listSboms(page: number = 1, search?: string): Promise<SbomListResponse> {
    if (!this.checkDirectoryExists()) {
      return {
        containers: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: this.itemsPerPage,
        },
      };
    }

    const containerDirs = this.getContainerDirs(search);
    const totalItems = containerDirs.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedDirs = containerDirs.slice(startIndex, endIndex);

    const containers: Container[] = paginatedDirs.map(name => ({
      name,
      files: this.getContainerFiles(name),
    }));

    return {
      containers,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage: this.itemsPerPage,
      },
    };
  }
    async getFileContent(containerName: string, fileName: string): Promise<string> {
    const filePath = path.join(this.sbomDir, containerName, fileName);

    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error(`Failed to read SBOM file: ${filePath}`, err);
          return reject(new Error('SBOM file not found'));
        }
        resolve(data);
      });
    });
  }

}
