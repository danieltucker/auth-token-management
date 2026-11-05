import axios, { AxiosInstance } from "axios";

/**
 * Builds an axios instance pointed at the Cognigy Management API.
 *
 * Trailing slashes on the base URL are stripped so callers can safely append
 * paths like `/v2.0/connections`. Authentication uses the `X-API-Key` header.
 */
export function buildApiClient(baseUrl: string, apiKey: string): AxiosInstance {
  let normalizedBaseUrl = (baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalizedBaseUrl) {
    throw new Error("Cognigy API base URL is missing on the connection.");
  }
  // Tolerate a base URL entered without a scheme (e.g. "api-trial.cognigy.ai").
  if (!/^https?:\/\//i.test(normalizedBaseUrl)) {
    normalizedBaseUrl = `https://${normalizedBaseUrl}`;
  }
  if (!(apiKey || "").trim()) {
    throw new Error("Cognigy API key is missing on the connection.");
  }

  return axios.create({
    baseURL: normalizedBaseUrl,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json"
    },
    // Do not throw on non-2xx here — nodes inspect the status themselves.
    validateStatus: () => true
  });
}

/**
 * Extracts a human-readable message from an axios error or error-shaped
 * response body, for logging and for the error payload stored to the flow.
 */
export function describeError(err: any): string {
  if (err && err.response) {
    const { status, data } = err.response;
    const detail = data && (data.message || data.error) ? (data.message || data.error) : JSON.stringify(data);
    return `HTTP ${status}: ${detail}`;
  }
  if (err && err.message) {
    return err.message;
  }
  return String(err);
}
