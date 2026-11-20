import { compareMultipleTools } from '@/lib/diffReports';
import { ISbom, ISbomPackage } from '@/models/ISbom';

// A comparison of three tools' SBOMs of one image, for stories: built by the real diff so it stays consistent
const sbom = (tool: string, vendor: string, format: ISbom['format'], packages: ISbomPackage[]): ISbom => ({
  format,
  tool,
  toolInfo: { name: tool, vendor, version: '1.0.0', format },
  imageId: 'nginx:1.27',
  packages,
  timestamp: '2026-11-19T00:00:00Z',
});

const openssl: ISbomPackage = { name: 'openssl', version: '3.0.15-1', packageType: 'os', license: 'Apache-2.0', supplier: 'Debian', purl: 'pkg:deb/debian/openssl@3.0.15-1?arch=amd64' };
const zlib: ISbomPackage = { name: 'zlib1g', version: '1:1.2.13', packageType: 'os', license: 'Zlib', purl: 'pkg:deb/debian/zlib1g@1:1.2.13?arch=amd64' };
const curl: ISbomPackage = { name: 'curl', version: '7.88.1', packageType: 'os', license: 'curl', purl: 'pkg:deb/debian/curl@7.88.1?arch=amd64' };
const lodash: ISbomPackage = { name: 'lodash', version: '4.17.21', packageType: 'npm', license: 'MIT', purl: 'pkg:npm/lodash@4.17.21' };
const requests: ISbomPackage = { name: 'requests', version: '2.32.3', packageType: 'python', license: 'Apache-2.0', purl: 'pkg:pypi/requests@2.32.3' };

export const mockComparison = compareMultipleTools([
  sbom('Syft', 'Anchore', 'SPDX', [openssl, zlib, curl, lodash]),
  // a different license than Syft's: a metadata conflict
  sbom('Trivy', 'Aqua Security', 'CycloneDX', [{ ...openssl, license: 'OpenSSL' }, zlib, curl, requests]),
  sbom('Docker Scout', 'Docker Inc.', 'SPDX', [openssl, zlib]),
]);
