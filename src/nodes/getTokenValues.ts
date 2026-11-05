import { makeGetValuesNode } from "../lib/getValuesNode";
import { TOKEN_SCHEMA } from "../lib/schemas";

export const getTokenValues = makeGetValuesNode({
  type: "getTokenValues",
  defaultLabel: "Get Token Values",
  summary: "Reads a token store connection's decrypted values (accessToken, expiresAt, refreshToken)",
  schema: TOKEN_SCHEMA,
  defaultResultKey: "token"
});
