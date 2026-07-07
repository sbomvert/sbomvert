
export function GenerateSPDXSBOMwithTool(tool: string, image: string): { cmd: string; args: string[] } | null {
  switch (tool) {
    case 'trivy':
      return {cmd: 'trivy',args: ['image','--format','spdx-json',image]}

    case 'syft':
      return {cmd: 'syft',args: [image,'-o=spdx-json']}

    case 'scout':
      return  {cmd: 'docker',args: ['scout','sbom',image,'--format=spdx']}

    default:
      return null;
  }
}

export function GenerateCycloneDXSBOMwithTool(tool: string, image: string): { cmd: string; args: string[] } | null {
  switch (tool) {
    case 'trivy':
      return {cmd: 'trivy',args: ['image','--format','cyclonedx',image]}

    case 'syft':
      return {cmd: 'syft',args: [image,'-o=cyclonedx-json']}

    case 'scout':
      return  {cmd: 'docker',args: ['scout','sbom',image,'--format=cyclonedx']}

    default:
      return null;
  }
}
