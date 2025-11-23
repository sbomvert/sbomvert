import { LocalSbomService } from "@/services/localSbomService";
import { ISbomService } from "@/services/sbomService.types";
import { S3SbomService } from "@/services/sbomServiceS3";
import { NextResponse } from "next/server";

interface Params {
    image: string;
    file: string;
}

let sbomService: ISbomService;

if (process.env.NODE_ENV === 'production') {
    sbomService = new S3SbomService(
        process.env.S3_SBOM_BUCKET || 'sbomvert',
        process.env.S3_SBOM_PREFIX || 'sbom/',
        20
    );
} else {
    sbomService = new LocalSbomService('./public/sbom', 20);
}

export async function GET(
    _req: Request,
    { params }: { params: Params }
) {
    const { image, file } = params;
    const result = await sbomService.getFileContent(image, file)
    // Example logic: return JSON
   return NextResponse.json(JSON.parse(result));

}