"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { apiKeyPlugin } from "@/lib/auth/api-key-plugin"
// import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin"
import { magicLinkPlugin } from "@/lib/auth/magic-link-plugin"
import { authClient } from "@/lib/auth-client"
import { getQueryClient } from "@/lib/query-client"
import { AuthProvider } from "./auth/auth-provider"
import { Toaster } from "./ui/sonner"
import { TooltipProvider } from "./ui/tooltip"

export function Providers({ children }: { children: ReactNode }) {
    const router = useRouter()
    const queryClient = getQueryClient()

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
                <TooltipProvider>{children}</TooltipProvider>
                <Toaster />
            </AuthProvider>
        </QueryClientProvider>
    )
}
