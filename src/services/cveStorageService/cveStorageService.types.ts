// Shared interfaces for SBOM services

export interface CVEfile {
  name: string;
  path: string;
  size?: number;
  lastModified?: Date;
}

export interface Container {
  name: string;
  files: CVEfile[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface CVEListResponse {
  containers: Container[];
  pagination: PaginationInfo;
}

// Abstract interface that both implementations follow
export interface CVEServiceType {
  listCVEFiles(containerName: string): Promise<CVEfile[]>;
  getFileContent(containerName: string, fileName: string): Promise<string>;
  saveCVEFile(image: string, type: string, tool: string, content: string): Promise<void>;
}
