import { SBOM_FORMATS, SupportedTools, producesFormat, sbomProducerFor } from './tools';
import { GenerateSBOMsWithTool } from './sbom/generator';
import { ScanSbomWithTool } from './vuln/scanner';
import { VULN_EXTRACTORS } from '@sbomvert/core/vuln/vulnutils';

// The form offers exactly these tools, so the worker must be able to run every one of them.
test.each(SupportedTools.producers.map(t => t.name))('producer %s has an SBOM command', tool => {
  expect(GenerateSBOMsWithTool(tool, 'alpine', '/tmp')).not.toBeNull();
});

// The form warns about the formats a tool cannot write; the tool must then not try to write them, and must write the others.
test.each(SupportedTools.producers.flatMap(t => SBOM_FORMATS.map(f => [t.name, f, t] as const)))(
  'producer %s runs for %s exactly when it supports it',
  (name, format, tool) => {
    expect(GenerateSBOMsWithTool(name, 'alpine', '/tmp', [format])!.runs.length > 0).toBe(producesFormat(tool, format));
  }
);

test.each(SupportedTools.consumers.map(t => t.name))(
  'scanner %s has a scan command and a report parser, and its SBOM can be produced',
  tool => {
    expect(ScanSbomWithTool(tool, '/tmp/sbom.json')).not.toBeNull();
    expect(Object.hasOwn(VULN_EXTRACTORS, tool)).toBe(true);
    expect(SupportedTools.producers.map(t => t.name)).toContain(sbomProducerFor(tool));
  }
);

test('scanners read their own SBOM unless told otherwise (grype reads syft)', () => {
  expect(sbomProducerFor('grype')).toBe('syft');
  expect(sbomProducerFor('trivy')).toBe('trivy');
});
