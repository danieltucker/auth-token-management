import type { IConnectionSchema } from "@cognigy/extension-tools";
import { CREDENTIALS_SCHEMA } from "../lib/schemas";

/**
 * A store for the static credentials used to obtain a token: client id/secret,
 * the token endpoint, and an optional scope. Managed via the Create/Read/Update
 * nodes.
 */
export const credentialsStoreConnection: IConnectionSchema = {
  type: CREDENTIALS_SCHEMA.type,
  label: "Auth credentials store (clientId, clientSecret, tokenUrl, scope)",
  fields: CREDENTIALS_SCHEMA.fields.map((fieldName) => ({ fieldName }))
};
