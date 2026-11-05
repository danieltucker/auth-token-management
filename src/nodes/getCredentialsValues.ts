import { makeGetValuesNode } from "../lib/getValuesNode";
import { CREDENTIALS_SCHEMA } from "../lib/schemas";

export const getCredentialsValues = makeGetValuesNode({
  type: "getCredentialsValues",
  defaultLabel: "Get Credentials Values",
  summary: "Reads a credentials store connection's decrypted values (clientId, clientSecret, tokenUrl, scope)",
  schema: CREDENTIALS_SCHEMA,
  defaultResultKey: "credentials"
});
