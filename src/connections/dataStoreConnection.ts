import type { IConnectionSchema } from "@cognigy/extension-tools";
import { DATA_SCHEMA } from "../lib/schemas";

/**
 * A generic store with six free-form slots (`value1`…`value6`) for holding
 * non-uniform connection data or other values worth keeping in a Connection.
 */
export const dataStoreConnection: IConnectionSchema = {
  type: DATA_SCHEMA.type,
  label: "Data store (value1…value6)",
  fields: DATA_SCHEMA.fields.map((fieldName) => ({ fieldName }))
};
