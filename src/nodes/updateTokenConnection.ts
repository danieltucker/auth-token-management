import { makeUpdateConnectionNode } from "../lib/updateNode";
import { TOKEN_SCHEMA } from "../lib/schemas";

export const updateTokenConnection = makeUpdateConnectionNode({
  type: "updateTokenConnection",
  defaultLabel: "Update Token Connection",
  summary: "Updates a token store connection (fill only the fields you want to change)",
  schema: TOKEN_SCHEMA,
  valueFields: [
    { key: "accessToken", label: "Access Token" },
    { key: "expiresAt", label: "Expires At", description: "When the token expires (e.g. an epoch or ISO timestamp)" },
    { key: "refreshToken", label: "Refresh Token" }
  ]
});
