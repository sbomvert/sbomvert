import { CVEServiceType } from './cveStorageService.types';
import { S3CVEService } from './cveStorageServiceS3';
import { LocalCVEService } from './localcveStorageService';

let CVEService: CVEServiceType;

if (process.env.NODE_ENV === 'production') {
  CVEService = new S3CVEService('sbomvert', 'cves/', 20);
} else {
  CVEService = new LocalCVEService(process.env.CVE_DIR|| './public/cves', 20);
}

export default CVEService;
