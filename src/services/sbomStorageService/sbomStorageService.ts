import { LocalSbomService } from './localSbomService';
import { ISbomService } from './sbomService.types';
import { S3SbomService } from './sbomServiceS3';

let SBOMService: ISbomService;

if (process.env.NODE_ENV === 'production') {
  SBOMService = new S3SbomService('sbomvert', 'sbom/', 20);
} else {
  SBOMService = new LocalSbomService(process.env.SBOM_DIR || './public/sbom', 20);
}

export default SBOMService;
