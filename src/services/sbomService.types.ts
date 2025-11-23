// Shared interfaces for SBOM services

export interface SbomFile {
  name: string;
  path: string;
  size?: number;
  lastModified?: Date;
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

// Abstract interface that both implementations follow
export interface ISbomService {
  listSboms(page?: number, search?: string): Promise<SbomListResponse>;
    listFiles(containerName: string): Promise<SbomFile[]>; 

}
