import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import * as schemas from "@/db/schema"; // your drizzle instance
import { magicLink } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key"

export const auth = betterAuth({
    database: drizzleAdapter(db, {
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
            sendMagicLink: async ({ email, token, url, metadata }, ctx) => { 
                //TODO: send email to user
                console.log({email, token, url, metadata, ctx})
            } 
        }) 
    ]
});
