import { ISbom } from '@/models/ISbom';
import { parseSpdxSbom, parseCycloneDxSbom } from './parseSbom';

interface ContainerSboms {
  [containerName: string]: ISbom[];
}

interface ImageInfo {
  id: string;
  name: string;
  description: string;
}

// Convert container folder name to display name
const formatContainerName = (folderName: string): string => {
  return folderName.replace(/twodots/g, ':').replace(/dash/g, '-');
};

// Extract container description based on name
const getContainerDescription = (containerName: string): string => {
  const lowerName = containerName.toLowerCase();

  if (lowerName.includes('nginx')) return 'Popular web server';
  if (lowerName.includes('node')) return 'Node.js runtime';
  if (lowerName.includes('postgres')) return 'PostgreSQL database';
  if (lowerName.includes('redis')) return 'Redis cache';
  if (lowerName.includes('python')) return 'Python runtime';
  if (lowerName.includes('alpine')) return 'Alpine Linux base';
  if (lowerName.includes('ubuntu')) return 'Ubuntu base image';

  return 'Container image';
};

export const loadSbomsFromPublic = async (): Promise<{
  images: ImageInfo[];
  sboms: ContainerSboms;
}> => {
  try {
    // Fetch the directory structure from API
    const response = await fetch('/api/sbom-files');

    if (!response.ok) {
      console.error('Failed to fetch SBOM files list');
      return { images: [], sboms: {} };
    }

    const { containers } = await response.json();

    const images: ImageInfo[] = [];
    const sboms: ContainerSboms = {};

    // Load SBOMs for each container
    for (const container of containers) {
      const containerName = formatContainerName(container.name);
      const sbomList: ISbom[] = [];

      for (const file of container.files) {
        try {
          const filePath = `/sbom/${container.name}/${file.name}`;
          const sbomResponse = await fetch(filePath);

          if (!sbomResponse.ok) {
            console.warn(`Failed to load SBOM: ${filePath}`);
            continue;
          }

          const sbomData = await sbomResponse.json();

          // Determine tool name and format from filename
          const nameParts = file.name.split('.');
          const toolName = nameParts[0];
          const format = nameParts[1]?.toUpperCase();

          let parsedSbom: ISbom | null = null;

          if (format === 'SPDX') {
            parsedSbom = parseSpdxSbom(sbomData, containerName);
          } else if (format === 'CYCLONEDX') {
            parsedSbom = parseCycloneDxSbom(sbomData, containerName, toolName);
          }

          if (parsedSbom) {
            sbomList.push(parsedSbom);
          }
        } catch (error) {
          console.error(`Error loading SBOM ${file.name}:`, error);
        }
      }

      if (sbomList.length > 0) {
        images.push({
          id: containerName,
          name: containerName,
          description: getContainerDescription(containerName),
        });
        sboms[containerName] = sbomList;
      }
    }

    return { images, sboms };
  } catch (error) {
    console.error('Error loading SBOMs:', error);
    return { images: [], sboms: {} };
  }
};