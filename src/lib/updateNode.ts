import { createNodeDescriptor } from "@cognigy/extension-tools";
import { buildApiClient, describeError } from "./apiClient";
import { pickFields, storeResult } from "./nodeHelpers";
import { ISchemaDef } from "./schemas";

export interface IValueField {
  key: string;
  label: string;
  description?: string;
}

/**
 * Builds an "Update <kind> Connection" node. Uses named fields (like the
 * connection stores themselves) rather than a free-form JSON field, which both
 * persists reliably and prevents invalid update payloads. Only the fields you
 * fill in are sent; blanks are omitted so you can update just a subset (e.g.
 * rotate only the accessToken).
 *
 * Update goes through the Management API (`PATCH`), which requires the
 * connection's Mongo `_id` (from List Connections) and an API connection.
 */
export function makeUpdateConnectionNode(opts: {
  type: string;
  defaultLabel: string;
  summary: string;
  schema: ISchemaDef;
  valueFields: IValueField[];
}): ReturnType<typeof createNodeDescriptor> {
  const valueFieldDescriptors = opts.valueFields.map((f) => ({
    key: f.key,
    label: f.label,
    type: "cognigyText" as const,
    description: f.description
  }));

  return createNodeDescriptor({
    type: opts.type,
    defaultLabel: opts.defaultLabel,
    summary: opts.summary,
    fields: [
      {
        key: "connection",
        label: "Cognigy API Connection",
        type: "connection",
        description: "Connection holding the Cognigy Management API key and base URL",
        params: { connectionType: "cognigy-api", required: true }
      },
      {
        key: "connectionId",
        label: "Connection ID",
        type: "cognigyText",
        description: "24-character connection _id (from the List Connections node, or a CognigyScript value like {{context.tokenConnectionId}})",
        params: { required: true }
      },
      ...valueFieldDescriptors,
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
        description: "Key under input/context to store the update result",
        defaultValue: "connection"
      },
      {
        key: "onError",
        label: "On Error",
        type: "select",
        params: {
          options: [
            { label: "Stop execution", value: "stop" },
            { label: "Continue (store error)", value: "continue" }
          ],
          required: true
        },
        defaultValue: "stop"
      }
    ],
    sections: [
      {
        key: "fieldsSection",
        label: "Fields to update",
        defaultCollapsed: false,
        fields: opts.valueFields.map((f) => f.key)
      },
      {
        key: "storageOption",
        label: "Storage & Error Handling",
        defaultCollapsed: true,
        fields: ["storeLocation", "resultKey", "onError"]
      }
    ],
    form: [
      { type: "field", key: "connection" },
      { type: "field", key: "connectionId" },
      { type: "section", key: "fieldsSection" },
      { type: "section", key: "storageOption" }
    ],
    appearance: { color: "#f3a806" },
    function: async ({ cognigy, config }: any) => {
      const { api } = cognigy;
      const onError = config.onError || "stop";
      const storeLocation = config.storeLocation || "input";
      const resultKey = config.resultKey || "connection";
      const connectionId = (config.connectionId || "").trim();

      try {
        if (!connectionId) {
          throw new Error("Connection ID is required.");
        }

        const fields = pickFields(config, opts.schema.fields);
        if (Object.keys(fields).length === 0) {
          throw new Error("Provide at least one field value to update.");
        }

        const client = buildApiClient(config.connection.baseUrl, config.connection.apiKey);
        const response = await client.request({
          method: "PATCH",
          url: `/v2.0/connections/${encodeURIComponent(connectionId)}`,
          data: { fields }
        });

        if (response.status < 200 || response.status >= 300) {
          throw { response };
        }

        storeResult(api, storeLocation, resultKey, response.data || { success: true });
      } catch (err) {
        const message = describeError(err);
        // @ts-ignore - log is available on the execution API
        api.log("error", `Update Connection failed: ${message}`);
        if (onError === "stop") {
          throw new Error(message);
        }
        storeResult(api, storeLocation, resultKey, { error: message });
      }
    }
  });
}
