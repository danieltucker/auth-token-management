import { createNodeDescriptor } from "@cognigy/extension-tools";
import { storeResult } from "./nodeHelpers";
import { ISchemaDef } from "./schemas";

/**
 * Builds a node that reads a connection via a design-time BINDING (a connection
 * field), not the Management API. Cognigy injects the connection's DECRYPTED
 * field values into `config.connection`, so unlike the API-based Read node the
 * values come back in the clear (not masked as `****`).
 */
export function makeGetValuesNode(opts: {
  type: string;
  defaultLabel: string;
  summary: string;
  schema: ISchemaDef;
  defaultResultKey: string;
}): ReturnType<typeof createNodeDescriptor> {
  return createNodeDescriptor({
    type: opts.type,
    defaultLabel: opts.defaultLabel,
    summary: opts.summary,
    fields: [
      {
        key: "connection",
        label: "Connection",
        type: "connection",
        description: `The ${opts.schema.label} connection to read. Values are returned decrypted (this uses the connection binding, not the API).`,
        params: { connectionType: opts.schema.type, required: true }
      },
      {
        key: "storeLocation",
        label: "Where to store the result",
        type: "select",
        params: {
          options: [
            { label: "Input", value: "input" },
            { label: "Context", value: "context" }
          ],
          required: true
        },
        defaultValue: "input"
      },
      {
        key: "resultKey",
        label: "Result Key",
        type: "cognigyText",
        description: "Key under input/context to store the decrypted values",
        defaultValue: opts.defaultResultKey
      }
    ],
    form: [
      { type: "field", key: "connection" },
      { type: "field", key: "storeLocation" },
      { type: "field", key: "resultKey" }
    ],
    appearance: { color: "#f3a806" },
    function: async ({ cognigy, config }: any) => {
      const { api } = cognigy;
      const storeLocation = config.storeLocation || "input";
      const resultKey = config.resultKey || opts.defaultResultKey;

      const conn: any = config.connection || {};
      const values: Record<string, unknown> = {};
      // Return the schema's known fields (plus anything else present on the binding).
      const keys: string[] = Object.keys(conn);
      for (const key of keys) {
        values[key] = conn[key];
      }
      for (const fieldName of opts.schema.fields) {
        if (!(fieldName in values)) {
          values[fieldName] = conn[fieldName];
        }
      }

      storeResult(api, storeLocation, resultKey, values);
    }
  });
}
