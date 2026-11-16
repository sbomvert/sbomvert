// A CycloneDX JSON SBOM (1.4 to 1.6), the parts SBOMVert reads and writes. Written here rather than taken from
// @cyclonedx/cyclonedx-library, so that core depends on nothing; the shapes are those of its normalized JSON types.

export type CycloneDxProperty = { name?: string; value?: string };

export type CycloneDxHash = { alg: string; content: string };

export type CycloneDxLicense =
  | { license: { id: string; url?: string } }
  | { license: { name: string; url?: string } }
  | { expression: string };

export type CycloneDxOrganization = { name?: string; url?: string[] };

export type CycloneDxExternalReference = { url: string; type: string; comment?: string };

export type CycloneDxComponent = {
  type: string;
  name: string;
  'bom-ref'?: string;
  supplier?: CycloneDxOrganization;
  author?: string;
  publisher?: string;
  group?: string;
  version?: string;
  description?: string;
  hashes?: CycloneDxHash[];
  licenses?: CycloneDxLicense[];
  copyright?: string;
  cpe?: string;
  purl?: string;
  externalReferences?: CycloneDxExternalReference[];
  components?: CycloneDxComponent[];
  properties?: CycloneDxProperty[];
};

// CycloneDX 1.4 lists tools; 1.5 and later give them as components and services
export type CycloneDxTool = { vendor?: string; name?: string; version?: string };
export type CycloneDxTools = CycloneDxTool[] | { components?: CycloneDxComponent[]; services?: CycloneDxTool[] };

export type CycloneDxBom = {
  $schema?: string;
  bomFormat: 'CycloneDX';
  specVersion: string;
  version: number;
  serialNumber?: string;
  metadata?: {
    timestamp?: string;
    tools?: CycloneDxTools;
    component?: CycloneDxComponent;
    supplier?: CycloneDxOrganization;
    properties?: CycloneDxProperty[];
  };
  components?: CycloneDxComponent[];
  dependencies?: { ref: string; dependsOn?: string[] }[];
};
