import type { IConnectionSchema } from "@cognigy/extension-tools";

export type CognigyApiConnection = {
  apiKey: string;
  baseUrl: string;
};

/**
 * Holds the Cognigy Management API key and the API base URL. Both are read from
 * the connection at runtime (proven to persist and be readable — creating a
 * connection succeeds using these values). Connection editor fields display
 * blank when re-opened because Cognigy encrypts them, but the stored values
 * remain intact.
 */
export const cognigyApiConnection: IConnectionSchema = {
  type: "cognigy-api",
  label: "Cognigy Management API (API key + base URL)",
  fields: [
    { fieldName: "apiKey" },
    { fieldName: "baseUrl" }
  ],
};
