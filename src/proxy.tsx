import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { getAuth } from './lib/auth';

export async function proxy(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_SCAN_API) {
        return NextResponse.redirect(new URL("/", request.url))
    }

    // NOTE: it's only for now
    if (
        FEATURE_FLAGS.ENABLE_AUTH &&
        request.nextUrl.pathname === "/api/scan" &&
        request.method === "POST"
    ) {
        const apiKeyString = request.headers.get("x-api-key")

        // CLI authentication
        if (apiKeyString) {
            const result = await getAuth().api.verifyApiKey({
                body: {
                    key: apiKeyString,
                },
            })

            if (!result?.valid) {
                return NextResponse.json(
                    {
                        error: "Unauthorized: Invalid or expired API key.",
                    },
                    {
                        status: 401,
                    },
                )
            }

            return NextResponse.next()
        }

        // Web authentication
        const session = await getAuth().api.getSession({
            headers: request.headers,
        })

        if (session?.session) {
            return NextResponse.next()
        }

        return NextResponse.json(
            {
                error: "Unauthorized",
            },
            {
                status: 401,
            },
        )
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
