import { reverseFormatContainerName } from "../container/containerUtils";
import { VulnReport } from '@sbomvert/core/vuln/vulnutils';

export interface CVEReport {
  [containerName: string]: VulnReport;
}

const getToolFromURL = (filename: string): string => 
  filename.split('.')[0] || 'none';

const getFormatFromURL = (filename: string): string => 
  filename.split('.')[1].toUpperCase() || 'none';

export const loadCVEsForImage = async (
  image: string
): Promise<{ cves: CVEReport }> => {
  try {
    const reformatName = reverseFormatContainerName(image);
    const cves: CVEReport = {};

    // Fetch list of files
    const response = await fetch(`/api/cve?image=${reformatName}`);
    if (!response.ok) {
      console.error("Failed to fetch CVE files list");
      return { cves: {} };
    }

    const data: { files?: { name: string }[] } = await response.json();
    if (!data.files || !Array.isArray(data.files)) {
      return { cves: {} };
    }

 

  const cvePromises = data.files.map(async (file) => {
  try {
    const filePath = `/api/cve/${reformatName}/${file.name}`;
    const res = await fetch(filePath);

    if (!res.ok) return null;

    const data = (await res.json()) as VulnReport;
     const toolName = getToolFromURL(file.name)
     const format = getFormatFromURL(file.name)

    return {
      report: data,
      toolName,
      format
    };
  } catch (err) {
    console.error(`Error loading CVE ${file.name}:`, err);
    return null;
  }
});

const results = await Promise.all(cvePromises);

const validResults = results.filter(
  (x): x is { report: VulnReport, toolName: string, format: string } => x !== null
);

for (const { report, toolName,format } of validResults) {
  // 👉 Extract tool name from filePath


  cves[`${toolName} (${format})`] = report;
}

return { cves };
  } catch (err) {
    console.error("Error loading CVEs:", err);
    return { cves: {} }; // ✅ fixed
  }
};