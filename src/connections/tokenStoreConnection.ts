import type { IConnectionSchema } from "@cognigy/extension-tools";
import { TOKEN_SCHEMA } from "../lib/schemas";

/**
 * A store for a rotating access token: the token itself, its expiry, and an
 * optional refresh token. Managed via the Create/Read/Update nodes.
 */
export const tokenStoreConnection: IConnectionSchema = {
  type: TOKEN_SCHEMA.type,
  label: "Auth token store (accessToken, expiresAt, refreshToken)",
  fields: TOKEN_SCHEMA.fields.map((fieldName) => ({ fieldName }))
};
