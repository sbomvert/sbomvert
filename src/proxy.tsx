import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { auth } from './lib/auth';

export async function proxy(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_SCAN_API) {
        return NextResponse.redirect(new URL("/", request.url))
    }

    // NOTE: it's only for now
    if (
        request.nextUrl.pathname === "/api/scan" &&
        request.method === "POST"
    ) {
        const apiKeyString = request.headers.get("x-api-key")

        // CLI authentication
        if (apiKeyString) {
            const result = await auth.api.verifyApiKey({
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
        const session = await auth.api.getSession({
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
        "/api/scan",
    ],
}
