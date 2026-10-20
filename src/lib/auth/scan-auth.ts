import { getAuth } from "@/lib/auth";

export type ScanAuthResult =
    | { ok: true }
    | { ok: false; status: 401; error: string };

// Authorizes a scan request by API key (CLI) or session cookie (web). Shared by
// the proxy gate and the /api/scan route handler so both agree on the rules.
export async function authorizeScanRequest(headers: Headers): Promise<ScanAuthResult> {
    const apiKeyString = headers.get("x-api-key");

    if (apiKeyString) {
        const result = await getAuth().api.verifyApiKey({ body: { key: apiKeyString } });
        return result?.valid
            ? { ok: true }
            : { ok: false, status: 401, error: "Unauthorized: Invalid or expired API key." };
    }

    const session = await getAuth().api.getSession({ headers });
    return session?.session
        ? { ok: true }
        : { ok: false, status: 401, error: "Unauthorized" };
}
