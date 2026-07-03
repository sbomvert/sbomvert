import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
 
// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_SCAN_API) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}
 
export const config = {
    matcher: [
        // Exclude API routes, static files, image optimizations, and .png files
        '/scan',
        '/api/scan/:path*'
    ],
}
