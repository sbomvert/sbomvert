/**
 * @jest-environment node
 */
import { GET } from './route';

test('lists the formats, the SBOM producers and the CVE scanners', async () => {
  const body = await GET().json();
  expect(body.formats).toStrictEqual(['spdx', 'cdx']);
  expect(body.producers.map((t: { name: string }) => t.name)).toContain('amazon');
  expect(body.consumers.find((t: { name: string }) => t.name === 'grype')).toMatchObject({ find_cves: true, sbom_from: 'syft' });
});
