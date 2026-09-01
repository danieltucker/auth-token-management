/**
 * Shared helpers used by the connection-management nodes.
 */

export type StoreLocation = "input" | "context";
export type OnError = "stop" | "continue";

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
