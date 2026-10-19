import { getAuth } from "@/lib/auth";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { toNextJsHandler } from "better-auth/next-js";

const handle = (method: "GET" | "POST") => (request: Request) =>
    FEATURE_FLAGS.ENABLE_AUTH
        ? toNextJsHandler(getAuth())[method](request)
        : new Response("Not found", { status: 404 });

export const GET = handle("GET");
export const POST = handle("POST");
