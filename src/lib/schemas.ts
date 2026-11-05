/**
 * Connection schemas defined by THIS extension. Their field keys are known
 * ahead of time, so the Get/Update nodes can present named fields and read the
 * decrypted values via a binding.
 */

export interface ISchemaDef {
  type: string;
  label: string;
  fields: string[];
}

export const TOKEN_SCHEMA: ISchemaDef = {
  type: "auth-token",
  label: "Token store",
  fields: ["accessToken", "expiresAt", "refreshToken"]
};

export const CREDENTIALS_SCHEMA: ISchemaDef = {
  type: "auth-credentials",
  label: "Credentials store",
  fields: ["clientId", "clientSecret", "tokenUrl", "scope"]
};

export const DATA_SCHEMA: ISchemaDef = {
  type: "auth-data",
  label: "Data store",
  fields: ["value1", "value2", "value3", "value4", "value5", "value6"]
};
