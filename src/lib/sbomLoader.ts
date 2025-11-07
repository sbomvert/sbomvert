import { ISbom } from '@/models/ISbom';
import { parseSpdxSbom, parseCycloneDxSbom } from './parseSbom';

interface ContainerSboms {
  [containerName: string]: ISbom[];
}

interface ImageInfo {
  id: string;
  name: string;
  description: string;
  toolsScanned: number
}

// Convert container folder name to display name
const formatContainerName = (folderName: string): string => {
  return folderName.replace(/-?twodots/g, ':').replace(/-?dash/g, '-').replace(/-?slash/g, '/');
};

const reverseFormatContainerName = (formattedName: string): string => {
  return formattedName
    .replace(/:/g, 'twodots')
    .replace(/-/g, 'dash')
    .replace(/\//g, 'slash'); 
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



export const loadSbomsForImage = async (image: string): Promise<{
  sboms: ContainerSboms;
}> => {
  try {
   const reformatName = reverseFormatContainerName(image)

    const sboms: ContainerSboms = {};
    // Fetch the directory structure from API
    const response = await fetch(`/api/sbom/image?name=${reformatName}`);
    console.log(response)
    if (!response.ok) {
      console.error('Failed to fetch SBOM files list');
      return { sboms: {} };
    }
    const { files } = await response.json();
    console.log(files)
    // Load SBOMs for each container
      const sbomList: ISbom[] = [];

      for (const file of files) {
        try {
          const filePath = `/sbom/${reformatName}/${file.name}`;
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
            parsedSbom = parseSpdxSbom(sbomData, image,file.name);
          } else if (format === 'CYCLONEDX') {
            parsedSbom = parseCycloneDxSbom(sbomData, image, toolName);
          }

          if (parsedSbom) {
            sbomList.push(parsedSbom);
          }
        } catch (error) {
          console.error(`Error loading SBOM ${file.name}:`, error);
        }
      }

      if (sbomList.length > 0) {
   
        sboms[image] = sbomList;
      }

    return { sboms };
  } catch (error) {
    console.error('Error loading SBOMs:', error);
    return { sboms: {} };
  }
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
            parsedSbom = parseSpdxSbom(sbomData, containerName, toolName || 'Unknown');
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
          toolsScanned: 0 // This will be updated later when we load the actual SBOMs
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

export const loadSbomImagesFromPublic = async (): Promise<{
  images: ImageInfo[];
}> => {
  try {
    // Fetch the directory structure from API
    const response = await fetch('/api/sbom-files');

    if (!response.ok) {
      console.error('Failed to fetch SBOM files list');
      return { images: [] };
    }

    const { containers } = await response.json();

    const images: ImageInfo[] = [];

    // Load SBOMs for each container
    for (const container of containers) {
      const containerName = formatContainerName(container.name);
 

        images.push({
          id: containerName,
          name: containerName,
          description: getContainerDescription(containerName),
          toolsScanned: container.files.length
        });
    }

    return { images };
  } catch (error) {
    console.error('Error loading SBOMs:', error);
    return { images: [] };
  }
};