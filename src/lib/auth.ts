import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "@/db";
import * as schemas from "@/db/schema"; // your drizzle instance
import { magicLink } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key"

const REQUIRED_ENV = ["DATABASE_URL", "BETTER_AUTH_SECRET"];

const createAuth = () => {
    const missing = REQUIRED_ENV.filter(name => !process.env[name]);
    if (missing.length) {
        throw new Error(`Authentication is enabled (NEXT_PUBLIC_ENABLE_AUTH) but ${missing.join(", ")} is not set`);
    }
    return betterAuth({
        database: drizzleAdapter(createDb(), {
            provider: "pg", // or "mysql", "sqlite"
            schema: {
                ...schemas
            }
        }),
        socialProviders: {
            github: { 
                clientId: process.env.GITHUB_CLIENT_ID as string, 
                clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
            }, 
        },
        plugins: [
            apiKey({
                enableSessionForAPIKeys: true,
                rateLimit: {
                    enabled: true,
                    timeWindow: 1000 * 60 * 60, // 1 day
                    maxRequests: 50, // 10 requests per day
                },
                keyExpiration: {
                    minExpiresIn: 7,
                    maxExpiresIn: 90,
                    defaultExpiresIn: null,
                    disableCustomExpiresTime: false
                }
            }),
            magicLink({ 
                sendMagicLink: async ({ email, url }) => {
                    //TODO: send email to user
                    // A logged link signs in as that user: only in development, never in production logs.
                    if (process.env.NODE_ENV === "production") {
                        throw new Error("Magic link sign-in needs email sending, which is not configured")
                    }
                    console.log(`Magic link for ${email}: ${url}`)
                }
            }) 
        ]
    });
};

let instance: ReturnType<typeof createAuth> | undefined;

// Built on first use, so with auth disabled nothing needs Postgres, the secret or GitHub credentials.
export const getAuth = () => (instance ??= createAuth());
