import { makeUpdateConnectionNode } from "../lib/updateNode";
import { CREDENTIALS_SCHEMA } from "../lib/schemas";

export const updateCredentialsConnection = makeUpdateConnectionNode({
  type: "updateCredentialsConnection",
  defaultLabel: "Update Credentials Connection",
  summary: "Updates a credentials store connection (fill only the fields you want to change)",
  schema: CREDENTIALS_SCHEMA,
  valueFields: [
    { key: "clientId", label: "Client ID" },
    { key: "clientSecret", label: "Client Secret" },
    { key: "tokenUrl", label: "Token URL", description: "The token endpoint used to obtain/refresh the access token" },
    { key: "scope", label: "Scope" }
  ]
});
