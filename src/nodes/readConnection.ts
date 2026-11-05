import { createNodeDescriptor, INodeFunctionBaseParams } from "@cognigy/extension-tools";
import { buildApiClient, describeError } from "../lib/apiClient";
import { flattenFields, storeResult } from "../lib/nodeHelpers";

export interface IReadConnectionParams extends INodeFunctionBaseParams {
  config: {
    connection: { apiKey: string; baseUrl: string };
    connectionId: string;
    onError: "stop" | "continue";
    storeLocation: "input" | "context";
    resultKey: string;
  };
}

export const readConnection = createNodeDescriptor({
  type: "readConnection",
  defaultLabel: "Read Connection",
  summary: "Reads the current values of a Cognigy Connection via the Management API",
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
    },
    {
      key: "storeLocation",
      type: "select",
      label: "Where to store the result",
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
      type: "cognigyText",
      label: "Result Key",
      description: "Key under input/context to store the connection",
      defaultValue: "connection"
    }
  ],
  sections: [
    {
      key: "storageOption",
      label: "Storage & Error Handling",
      defaultCollapsed: true,
      fields: ["onError", "storeLocation", "resultKey"]
    }
  ],
  form: [
    { type: "field", key: "connection" },
    { type: "field", key: "connectionId" },
    { type: "section", key: "storageOption" }
  ],
  appearance: { color: "#f3a806" },
  function: async ({ cognigy, config }: IReadConnectionParams) => {
    const { api } = cognigy;
    const { connection } = config;

    // Field defaultValues are only UI hints — apply defaults defensively.
    const onError = config.onError || "stop";
    const storeLocation = config.storeLocation || "input";
    const resultKey = config.resultKey || "connection";
    const connectionId = (config.connectionId || "").trim();

    try {
      if (!connectionId) {
        throw new Error("Connection ID is required.");
      }

      const client = buildApiClient(connection.baseUrl, connection.apiKey);

      const response = await client.request({
        method: "GET",
        url: `/v2.0/connections/${encodeURIComponent(connectionId)}`
      });

      if (response.status < 200 || response.status >= 300) {
        throw { response };
      }

      const data = response.data || {};
      const result = {
        ...data,
        fields: flattenFields(data.fields)
      };

      storeResult(api, storeLocation, resultKey, result);
    } catch (err) {
      const message = describeError(err);
      // @ts-ignore - log is available on the execution API
      api.log("error", `Read Connection failed: ${message}`);
      if (onError === "stop") {
        throw new Error(message);
      }
      storeResult(api, storeLocation, resultKey, { error: message });
    }
  }
});
