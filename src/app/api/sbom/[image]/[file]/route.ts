import SBOMService  from '@/services/sbomStorageService/sbomStorageService';

import { NextResponse } from "next/server";

interface Params {
    image: string;
    file: string;
}



export async function GET(
    _req: Request,
    { params }: { params: Params }
) {
    const { image, file } = await params;
    const result = await SBOMService.getFileContent(image, file)
    // Example logic: return JSON
   return NextResponse.json(JSON.parse(result));

}