import { createNodeDescriptor, INodeFunctionBaseParams } from "@cognigy/extension-tools";
import { buildApiClient, describeError } from "../lib/apiClient";
import { storeResult } from "../lib/nodeHelpers";

/**
 * The connection's Mongo `_id` is not returned as a field — it only appears in
 * the `_links.self.href` URL. Extract the final path segment.
 */
function extractConnectionId(c: any): string | undefined {
  if (c && c._id) {
    return c._id;
  }
  const href: string = (c && c._links && c._links.self && c._links.self.href) || "";
  if (href) {
    return href.split("?")[0].split("/").filter(Boolean).pop();
  }
  return undefined;
}

/**
 * Finds the array of connections in the response body, wherever it sits —
 * including nested under a wrapper object (e.g. `_embedded`, `data`, hypermedia
 * envelopes). Matches the first array whose elements look like connections.
 */
function findItemsArray(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (!data || typeof data !== "object") {
    return [];
  }
  if (Array.isArray(data.items)) {
    return data.items;
  }

  const looksLikeConnections = (arr: any[]): boolean =>
    arr.some((el: any): boolean =>
      Boolean(el && typeof el === "object" && (el.referenceId || el._links || el.name)));

  let found: any[] = [];
  const visit = (node: any): void => {
    if (found.length) {
      return;
    }
    if (Array.isArray(node)) {
      if (looksLikeConnections(node)) {
        found = node;
      }
      return;
    }
    if (node && typeof node === "object") {
      const keys: string[] = Object.keys(node);
      for (const key of keys) {
        visit(node[key]);
        if (found.length) {
          return;
        }
      }
    }
  };
  visit(data);
  return found;
}

export interface IListConnectionsParams extends INodeFunctionBaseParams {
  config: {
    connection: { apiKey: string; baseUrl: string };
    filter: string;
    resourceScope: "project" | "organisation";
    projectId: string;
    limit: number;
    onError: "stop" | "continue";
    storeLocation: "input" | "context";
    resultKey: string;
  };
}

export const listConnections = createNodeDescriptor({
  type: "listConnections",
  defaultLabel: "List Connections",
  summary: "Lists connections (name, _id, referenceId, type) via the Management API",
  fields: [
    {
      key: "connection",
      label: "Cognigy API Connection",
      type: "connection",
      description: "Connection holding the Cognigy Management API key and base URL",
      params: { connectionType: "cognigy-api", required: true }
    },
    {
      key: "filter",
      label: "Name Filter",
      type: "cognigyText",
      description: "Optional: only return connections whose name matches this filter"
    },
    {
      key: "resourceScope",
      label: "Resource Scope",
      type: "select",
      params: {
        options: [
          { label: "Project", value: "project" },
          { label: "Organisation", value: "organisation" }
        ],
        required: true
      },
      defaultValue: "project"
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "cognigyText",
      description: "Optional: the 24-character project ID (used with Project scope)"
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      description: "Maximum number of connections to return (1-100)",
      defaultValue: 100
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
      description: "Key under input/context to store the connection list",
      defaultValue: "connections"
    }
  ],
  sections: [
    {
      key: "querySection",
      label: "Query",
      defaultCollapsed: false,
      fields: ["filter", "resourceScope", "projectId", "limit"]
    },
    {
      key: "storageOption",
      label: "Storage & Error Handling",
      defaultCollapsed: true,
      fields: ["onError", "storeLocation", "resultKey"]
    }
  ],
  form: [
    { type: "field", key: "connection" },
    { type: "section", key: "querySection" },
    { type: "section", key: "storageOption" }
  ],
  appearance: { color: "#f3a806" },
  function: async ({ cognigy, config }: IListConnectionsParams) => {
    const { api } = cognigy;
    const { connection } = config;

    const onError = config.onError || "stop";
    const storeLocation = config.storeLocation || "input";
    const resultKey = config.resultKey || "connections";
    const resourceScope = config.resourceScope || "project";

    try {
      const client = buildApiClient(connection.baseUrl, connection.apiKey);

      // Build the query string explicitly so the exact request is visible in the result.
      const limitNum = Number(config.limit);
      const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 100) : 100;
      const qs: string[] = [`limit=${limit}`];

      const filter = (config.filter || "").trim();
      if (filter) {
        qs.push(`filter=${encodeURIComponent(filter)}`);
      }
      const projectId = (config.projectId || "").trim();
      if (resourceScope === "organisation") {
        qs.push("resourceLevel=organisation");
      } else if (projectId) {
        qs.push(`projectId=${encodeURIComponent(projectId)}`);
      }

      const requestPath = `/v2.0/connections?${qs.join("&")}`;
      const response = await client.request({ method: "GET", url: requestPath });

      const data: any = response.data;
      const rawItems: any[] = findItemsArray(data);
      // Inject the Mongo _id (pulled from _links.self.href) onto each item so it
      // sits alongside the other fields and is easy to capture.
      const items = rawItems.map((c: any) => ({ ...c, _id: extractConnectionId(c) }));
      // A trimmed summary for quick scanning.
      const connections = items.map((c: any) => ({
        name: c.name,
        _id: c._id,
        referenceId: c.referenceId,
        type: c.type || (c.connectionSchema && c.connectionSchema.type),
        extension: c.extension || (c.connectionSchema && c.connectionSchema.extension)
      }));

      const rawKeys: string[] | undefined =
        data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : undefined;

      storeResult(api, storeLocation, resultKey, {
        status: response.status,
        requestPath,
        count: items.length,
        rawKeys,
        connections,
        items,
        raw: data
      });

      if (response.status < 200 || response.status >= 300) {
        throw { response };
      }
    } catch (err) {
      const message = describeError(err);
      // @ts-ignore - log is available on the execution API
      api.log("error", `List Connections failed: ${message}`);
      if (onError === "stop") {
        throw new Error(message);
      }
      storeResult(api, storeLocation, resultKey, { error: message });
    }
  }
});
