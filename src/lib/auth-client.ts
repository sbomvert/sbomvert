import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client"

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(), 
    apiKeyClient() 
  ]
});
