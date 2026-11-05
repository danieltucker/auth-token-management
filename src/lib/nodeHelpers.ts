/**
 * Shared helpers used by the connection-management nodes.
 */

import { describeError } from "./apiClient";

export type StoreLocation = "input" | "context";
export type OnError = "stop" | "continue";

const CONNECTION_ID_PATTERN = /^[0-9a-f]{24}$/i;

/**
 * Parses the Connection ID node input into a de-duplicated list of ids.
 *
 * Accepts a single id or a comma-separated list (e.g. "6a88...,6abe..."). Stray
 * brackets and quotes are ignored so an array rendered by CognigyScript
 * (`["a","b"]`) also works. Ids that are not 24-character hex are returned in
 * `invalid` rather than throwing, so the valid ones can still be updated.
 */
export function parseConnectionIds(raw: unknown): { valid: string[]; invalid: string[] } {
  const text = Array.isArray(raw) ? raw.join(",") : typeof raw === "string" ? raw : "";
  const ids = text
    .replace(/[\[\]"']/g, "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(ids));
  return {
    valid: unique.filter((id) => CONNECTION_ID_PATTERN.test(id)),
    invalid: unique.filter((id) => !CONNECTION_ID_PATTERN.test(id))
  };
}

/**
 * Returns a shuffled copy of `items` (Fisher-Yates). Used to randomize update
 * order so that, if a run is cut short, the same ids aren't always the ones
 * left out — repeated refreshes will eventually reach every connection.
 */
export function shuffle<T>(items: T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface IUpdateConnectionsResult {
  total: number;
  updatedCount: number;
  failedCount: number;
  updated: { id: string; status: number }[];
  failed: { id: string; error: string }[];
}

/**
 * PATCHes the same `fields` into each connection, one at a time. A failure on
 * one id is recorded in `failed` and does not stop the remaining updates.
 * `client` is an axios instance from `buildApiClient` (does not throw on non-2xx).
 */
export async function updateConnections(
  client: { request: (config: any) => Promise<any> },
  ids: string[],
  fields: Record<string, string>
): Promise<IUpdateConnectionsResult> {
  const updated: IUpdateConnectionsResult["updated"] = [];
  const failed: IUpdateConnectionsResult["failed"] = [];

  for (const id of ids) {
    try {
      const response = await client.request({
        method: "PATCH",
        url: `/v2.0/connections/${encodeURIComponent(id)}`,
        data: { fields }
      });
      if (response.status < 200 || response.status >= 300) {
        throw { response };
      }
      updated.push({ id, status: response.status });
    } catch (err) {
      failed.push({ id, error: describeError(err) });
    }
  }

  return { total: ids.length, updatedCount: updated.length, failedCount: failed.length, updated, failed };
}

/**
 * Writes a result payload to the configured location (input or context)
 * under a single key. `api` is the Cognigy node execution API.
 */
export function storeResult(
  api: any,
  storeLocation: StoreLocation,
  key: string,
  value: unknown
): void {
  if (!key) {
    return;
  }
  if (storeLocation === "context") {
    api.addToContext(key, value, "simple");
  } else {
    api.addToInput(key, value);
  }
}

/**
 * Normalizes the free-form `fields` node input into a plain object.
 *
 * The `json` field type may deliver either a parsed object or a raw string
 * (e.g. when populated via a CognigyScript token). Both are handled.
 * Throws if the value cannot be resolved to a non-array object.
 */
export function normalizeFields(raw: unknown): Record<string, unknown> {
  let value = raw;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("The 'fields' value is empty.");
    }
    try {
      value = JSON.parse(trimmed);
    } catch (e) {
      throw new Error("The 'fields' value is not valid JSON.");
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The 'fields' value must be an object of name/value pairs.");
  }

  return value as Record<string, unknown>;
}

/**
 * Builds a connection `fields` object from named node inputs.
 *
 * Only keys whose value is a non-empty string are included, so optional fields
 * left blank in the node UI are omitted from the request rather than sent as
 * empty strings.
 */
export function pickFields(source: Record<string, unknown>, keys: string[]): Record<string, string> {
  return keys.reduce((acc: Record<string, string>, key) => {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

/**
 * Flattens the connection `fields` returned by the Management API into a
 * simple `{ name: value }` map.
 *
 * The API may return fields either as an array of `{ key, value }` objects or
 * as a plain object, depending on the route/version. Anything else yields `{}`.
 */
export function flattenFields(fields: unknown): Record<string, unknown> {
  if (Array.isArray(fields)) {
    return fields.reduce((acc: Record<string, unknown>, f: any) => {
      if (f && typeof f.key === "string") {
        acc[f.key] = f.value;
      }
      return acc;
    }, {});
  }
  if (fields && typeof fields === "object") {
    return fields as Record<string, unknown>;
  }
  return {};
}
