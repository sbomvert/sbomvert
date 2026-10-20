import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { authorizeScanRequest } from '@/lib/auth/scan-auth'

export async function proxy(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_SCAN_API) {
        return NextResponse.redirect(new URL("/", request.url))
    }

    // Gate the whole /api/scan subtree (submit + status/history) when auth is on.
    if (FEATURE_FLAGS.ENABLE_AUTH && request.nextUrl.pathname.startsWith("/api/scan")) {
        const auth = await authorizeScanRequest(request.headers)
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        // the whole scan feature is off without ENABLE_SCAN_API
        "/scan",
        "/api/scan/:path*",
    ],
}
