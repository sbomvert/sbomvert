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
    if (!fs.existsSync(this.sbomDir)) {
      fs.mkdirSync(this.sbomDir, { recursive: true })
    }
    return fs.existsSync(this.sbomDir)
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
      const fileNames = fs.readdirSync(containerPath)
        .filter(name => name.endsWith('.json'))
      const files = fileNames.map(name => {
        const filePath = path.join(containerPath, name)
        const stats = fs.statSync(filePath)
        return {
          name,
          path: `/sbom/${containerName}/${name}`,
          size: stats.size,
          lastModified: stats.mtime,
        }
      })
      return files
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

  /**
   * Save a file to the local file system
   */
  async saveFile(fileName: string, content: string): Promise<void> {
    // Ensure the directory exists
    const fullPath = path.join(this.sbomDir, fileName);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(fullPath, content, 'utf8');
  }
}
