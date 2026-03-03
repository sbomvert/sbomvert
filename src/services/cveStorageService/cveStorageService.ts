import { LocalSbomService } from './localcveStorageService';
import { CVEServiceType } from './cveStorageService.types';
import { S3CVEService } from './cveStorageServiceS3';

let SBOMService: CVEServiceType;

if (process.env.NODE_ENV === 'production') {
  SBOMService = new S3CVEService('sbomvert', 'cves/', 20);
} else {
  SBOMService = new LocalSbomService(process.env.SBOM_DIR || './public/cves', 20);
}

export default SBOMService;
