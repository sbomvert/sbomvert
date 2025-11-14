import { ISbom } from '@/models/ISbom';
import { parseSpdxSbom, parseCycloneDxSbom } from './parseSbom';

interface ContainerSboms {
  [containerName: string]: ISbom[];
}

interface ImageInfo {
  id: string;
  name: string;
  description: string;
  toolsScanned: number;
  sbomCount: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// --- Name format helpers ---
const formatContainerName = (folderName: string): string => {
  return folderName
    .replace(/-?twodots/g, ':')
    .replace(/-?slash/g, '/');
};

const reverseFormatContainerName = (formattedName: string): string => {
  return formattedName.replace(/:/g, 'twodots').replace(/\//g, 'slash');
};

// --- Description helper ---
const getContainerDescription = (containerName: string): string => {
  const lower = containerName.toLowerCase();
  if (lower.includes('nginx')) return 'Popular web server';
  if (lower.includes('node')) return 'Node.js runtime';
  if (lower.includes('postgres')) return 'PostgreSQL database';
  if (lower.includes('redis')) return 'Redis cache';
  if (lower.includes('python')) return 'Python runtime';
  if (lower.includes('alpine')) return 'Alpine Linux base';
  if (lower.includes('ubuntu')) return 'Ubuntu base image';
  return 'Container image';
};

// --- NEW: Load only image list (no SBOMs yet) ---
export const loadSbomImagesFromPublic = async (
  page: number = 1,
  search: string = ''
): Promise<{
  images: ImageInfo[];
  pagination: PaginationInfo;
}> => {
  try {
    const response = await fetch(
      `/api/sbom-files?page=${page}&search=${encodeURIComponent(search)}`
    );

    if (!response.ok) {
      console.error('Failed to fetch SBOM image list');
      return {
        images: [],
        pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 20 },
      };
    }

    const { containers, pagination } = await response.json();

    const images: ImageInfo[] = containers.map((container: any) => {
      const containerName = formatContainerName(container.name);
      return {
        id: containerName,
        name: containerName,
        description: getContainerDescription(containerName),
        toolsScanned: container.files.length,
        sbomCount: container.files.length,
      };
    });

    return { images, pagination };
  } catch (error) {
    console.error('Error loading image list:', error);
    return {
      images: [],
      pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 20 },
    };
  }
};

// --- Existing: Load SBOMs for a single image when clicked ---
export const loadSbomsForImage = async (
  image: string
): Promise<{
  sboms: ContainerSboms;
}> => {
  try {
    const reformatName = reverseFormatContainerName(image);
    const sboms: ContainerSboms = {};

    const response = await fetch(`/api/sbom/image?name=${reformatName}`);
    if (!response.ok) {
      console.error('Failed to fetch SBOM files list');
      return { sboms: {} };
    }
    console.log(response)
    const { files } = await response.json();
    const sbomList: ISbom[] = [];

    for (const file of files) {
      try {
        const filePath = `/sbom/${reformatName}/${file.name}`;
        const sbomResponse = await fetch(filePath);
        if (!sbomResponse.ok) continue;

        const sbomData = await sbomResponse.json();
        const nameParts = file.name.split('.');
        const toolName = nameParts[0];
        const format = nameParts[1]?.toUpperCase();

        let parsedSbom: ISbom | null = null;
        if (format === 'SPDX') parsedSbom = parseSpdxSbom(sbomData, image, toolName);
        else if (format === 'CYCLONEDX') parsedSbom = parseCycloneDxSbom(sbomData, image, toolName);

        if (parsedSbom) sbomList.push(parsedSbom);
      } catch (error) {
        console.error(`Error loading SBOM ${file.name}:`, error);
      }
    }

    if (sbomList.length > 0) sboms[image] = sbomList;
    return { sboms };
  } catch (error) {
    console.error('Error loading SBOMs:', error);
    return { sboms: {} };
  }
};
