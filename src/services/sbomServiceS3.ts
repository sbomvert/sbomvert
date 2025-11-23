import {
  S3Client,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  _Object,
} from '@aws-sdk/client-s3';
import type { ISbomService, SbomFile, Container, SbomListResponse } from './sbomService.types';

/**
 * S3-compatible implementation of SBOM service
 * Works with AWS S3, MinIO, DigitalOcean Spaces, etc.
 */
export class S3SbomService implements ISbomService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly prefix: string;
  private readonly itemsPerPage: number;

  constructor(
    bucketName: string,
    prefix: string = 'sbom/',
    itemsPerPage: number = 20,
    s3Client?: S3Client
  ) {
    this.bucketName = bucketName;
    this.prefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    this.itemsPerPage = itemsPerPage;

    this.s3Client =
      s3Client ||
      new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT, // For MinIO or other S3-compatible services
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // Required for MinIO
        credentials: process.env.S3_ENDPOINT
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
            }
          : undefined,
      });

  }

  /**
   * Extracts container name from S3 object key
   * Expected format: prefix/{containerName}/{filename}.json
   */
  private extractContainerName(key: string): string | null {
    const relativePath = key.startsWith(this.prefix) ? key.slice(this.prefix.length) : key;

    const parts = relativePath.split('/');
    const containerName = parts.length >= 2 ? parts[0] : null;

    return containerName;
  }

  /**
   * Lists all JSON objects in the S3 bucket under the prefix
   */
  private async listAllObjects(): Promise<
    Array<{ key: string; size: number; lastModified: Date }>
  > {
    const objects: Array<{ key: string; size: number; lastModified: Date }> = [];
    let continuationToken: string | undefined;

    do {
      const params: ListObjectsV2CommandInput = {
        Bucket: this.bucketName,
        Prefix: this.prefix,
        ContinuationToken: continuationToken,
      };

      const command = new ListObjectsV2Command(params);
      const response = await this.s3Client.send(command);

      if (response.Contents) {
        const newObjects = response.Contents.filter(
          (obj: _Object) => obj.Key && obj.Key.endsWith('.json')
        ).map((obj: _Object) => ({
          key: obj.Key!,
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
        }));
        objects.push(...newObjects);

      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  /**
   * Groups S3 objects by container name
   */
  private groupByContainer(
    objects: Array<{ key: string; size: number; lastModified: Date }>
  ): Map<string, SbomFile[]> {
    const containerMap = new Map<string, SbomFile[]>();

    for (const obj of objects) {
      const containerName = this.extractContainerName(obj.key);
      if (!containerName) continue;

      const fileName = obj.key.split('/').pop()!;
      const file: SbomFile = {
        name: fileName,
        path: `/sbom/${containerName}/${fileName}`,
        size: obj.size,
        lastModified: obj.lastModified,
      };

      if (!containerMap.has(containerName)) {
        containerMap.set(containerName, []);
      }
      containerMap.get(containerName)!.push(file);
    }

    return containerMap;
  }

  /**
   * Filters container names based on search term
   */
  private filterContainers(containerNames: string[], search?: string): string[] {
    if (!search) return containerNames;

    const searchLower = search.toLowerCase();
    return containerNames.filter(name => name.toLowerCase().includes(searchLower));
  }

  /**
   * Lists SBOM files with pagination and optional search
   */
  async listSboms(page: number = 1, search?: string): Promise<SbomListResponse> {
    try {
      const objects = await this.listAllObjects();
      const containerMap = this.groupByContainer(objects);

      let containerNames = Array.from(containerMap.keys()).sort();
      containerNames = this.filterContainers(containerNames, search);

      const totalItems = containerNames.length;
      const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
      const currentPage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (currentPage - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;

      const paginatedNames = containerNames.slice(startIndex, endIndex);

      const containers: Container[] = paginatedNames.map(name => ({
        name,
        files: containerMap.get(name) || [],
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
    } catch (error) {
      console.error('Error listing SBOMs from S3:', error);

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
  }

  /**
   * Gets the S3 URL for a specific SBOM file
   */
  getFileUrl(containerName: string, fileName: string): string {
    return `s3://${this.bucketName}/${this.prefix}${containerName}/${fileName}`;
  }
  /**
 * Returns all SBOM JSON files for a specific container name
 */
async listFiles(containerName: string): Promise<SbomFile[]> {
  if (!containerName) return [];

  try {
    const objects = await this.listAllObjects();
    const containerMap = this.groupByContainer(objects);

    // Return the files for that container (or empty array)
    return containerMap.get(containerName) || [];
  } catch (error) {
    console.error(`Error listing files for container ${containerName} from S3:`, error);
    return [];
  }
}

}
