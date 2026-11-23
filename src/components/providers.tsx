"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { MotionConfig } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { apiKeyPlugin } from "@/lib/auth/api-key-plugin"
// import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin"
import { magicLinkPlugin } from "@/lib/auth/magic-link-plugin"
import { authClient } from "@/lib/auth-client"
import { getQueryClient } from "@/lib/query-client"
import { FEATURE_FLAGS } from "@/lib/featureFlags"
import { AuthProvider } from "./auth/auth-provider"
import { Toaster } from "./ui/sonner"
import { TooltipProvider } from "./ui/tooltip"

export function Providers({ children }: { children: ReactNode }) {
    const router = useRouter()
    const queryClient = getQueryClient()

    // framer-motion animations follow the "reduce motion" setting of the OS
    const content = (
        <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
        </MotionConfig>
    )

    if (!FEATURE_FLAGS.ENABLE_AUTH) {
        return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
    }

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider
                authClient={authClient}
                redirectTo="/settings/account"
                socialProviders={["github"]}
                emailAndPassword={{ enabled: false }}
                navigate={({ to, replace }) =>
                    replace ? router.replace(to) : router.push(to)
                }
                plugins={[
                    magicLinkPlugin(),
                    apiKeyPlugin({
                        keyExpiration: {
                            intervals: [7, 30, 90],
                            defaultInterval: 30,
                            allowNever: true
                        }
                    })
                    // deleteUserPlugin(),
                ]}
                Link={Link}
            >
                {content}
            </AuthProvider>
        </QueryClientProvider>
    )
}
