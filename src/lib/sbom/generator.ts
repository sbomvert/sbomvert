
export function GenerateSPDXSBOMwithTool(tool: string, image: string): { cmd: string; args: string[] } | null {
  switch (tool) {
    case 'trivy':
      return {cmd: 'trivy',args: ['image','--format spdx-json',image]}

    case 'syft':
      return {cmd: 'syft',args: [image,'-o=spdx-json']}

    case 'scout':
      return  {cmd: 'docker',args: ['scout','sbom',image,'--format=spdx']}

    default:
      return null;
  }
}

