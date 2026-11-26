import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { authorizeScanRequest } from '@/lib/auth/scan-auth'

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const scanApi = pathname === '/api/scan' || pathname.startsWith('/api/scan/')

    if (!FEATURE_FLAGS.ENABLE_SCAN_API && (scanApi || pathname === '/scan')) {
        if (scanApi) {
            return NextResponse.json({ error: 'Scan feature disabled' }, { status: 403 })
        }
        return NextResponse.redirect(new URL("/", request.url))
    }

    if (FEATURE_FLAGS.ENABLE_AUTH && (scanApi || pathname === '/api/sbom/upload')) {
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
        "/api/sbom/upload",
    ],
}
