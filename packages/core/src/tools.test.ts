import { SupportedTools, sbomProducerFor } from './tools';
import { GenerateSBOMsWithTool } from './sbom/generator';
import { ScanSPDXwithTool } from './vuln/scanner';
import { VULN_EXTRACTORS } from './vuln/vulnutils';

// The form offers exactly these tools, so the worker must be able to run every one of them.
test.each(SupportedTools.producers.map(t => t.name))('producer %s has an SBOM command', tool => {
  expect(GenerateSBOMsWithTool(tool, 'alpine', '/tmp')).not.toBeNull();
});

test.each(SupportedTools.consumers.map(t => t.name))(
  'scanner %s has a scan command and a report parser, and its SBOM can be produced',
  tool => {
    expect(ScanSPDXwithTool(tool, '/tmp/sbom.json')).not.toBeNull();
    expect(Object.hasOwn(VULN_EXTRACTORS, tool)).toBe(true);
    expect(SupportedTools.producers.map(t => t.name)).toContain(sbomProducerFor(tool));
  }
);

test('scanners read their own SBOM unless told otherwise (grype reads syft)', () => {
  expect(sbomProducerFor('grype')).toBe('syft');
  expect(sbomProducerFor('trivy')).toBe('trivy');
});
