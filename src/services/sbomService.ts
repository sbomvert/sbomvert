import fs from 'fs';
import path from 'path';

export interface SbomFile {
  name: string;
  path: string;
}

export interface Container {
  name: string;
  files: SbomFile[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface SbomListResponse {
  containers: Container[];
  pagination: PaginationInfo;
}

export class SbomService {
  private readonly sbomDir: string;
  private readonly itemsPerPage: number;

  constructor(sbomDir: string, itemsPerPage: number = 8) {
    this.sbomDir = sbomDir;
    this.itemsPerPage = itemsPerPage;
  }

  private checkDirectoryExists(): boolean {
    return fs.existsSync(this.sbomDir);
  }

  private getContainerDirs(search?: string): string[] {
    const dirs = fs.readdirSync(this.sbomDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    if (search) {
      return dirs.filter(name => 
        name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return dirs;
  }

  private getContainerFiles(containerName: string): SbomFile[] {
    const containerPath = path.join(this.sbomDir, containerName);
    return fs.readdirSync(containerPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
      .map(dirent => ({
        name: dirent.name,
        path: `/sbom/${containerName}/${dirent.name}`,
      }));
  }

  listSboms(page: number = 1, search?: string): SbomListResponse {
    if (!this.checkDirectoryExists()) {
      return {
        containers: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: this.itemsPerPage
        }
      };
    }

    const containerDirs = this.getContainerDirs(search);
    const totalItems = containerDirs.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;

    const paginatedDirs = containerDirs.slice(startIndex, endIndex);
    const containers = paginatedDirs.map(name => ({
      name,
      files: this.getContainerFiles(name)
    }));

    return {
      containers,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage: this.itemsPerPage
      }
    };
  }
}

// Create default instance with standard configuration
export const defaultSbomService = new SbomService(
  path.join(process.cwd(), 'public', 'sbom')
);