const { test } = require("node:test");
const assert = require("node:assert/strict");

const { buildApiClient, describeError } = require("../build/lib/apiClient");

// ---------------------------------------------------------------------------
// buildApiClient
// ---------------------------------------------------------------------------

test("buildApiClient strips trailing slashes from the base URL", () => {
  const client = buildApiClient("https://api-app.cognigy.ai///", "key123");
  assert.equal(client.defaults.baseURL, "https://api-app.cognigy.ai");
});

test("buildApiClient trims surrounding whitespace", () => {
  const client = buildApiClient("  https://api-trial.cognigy.ai  ", "key123");
  assert.equal(client.defaults.baseURL, "https://api-trial.cognigy.ai");
});

test("buildApiClient sets the X-API-Key header", () => {
  const client = buildApiClient("https://x.cognigy.ai", "secret-key");
  assert.equal(client.defaults.headers["X-API-Key"], "secret-key");
  assert.equal(client.defaults.headers["Content-Type"], "application/json");
});

test("buildApiClient accepts any HTTP status (caller inspects it)", () => {
  const client = buildApiClient("https://x.cognigy.ai", "k");
  assert.equal(client.defaults.validateStatus(200), true);
  assert.equal(client.defaults.validateStatus(404), true);
  assert.equal(client.defaults.validateStatus(500), true);
});

test("buildApiClient prepends https:// when the scheme is missing", () => {
  const client = buildApiClient("api-trial.cognigy.ai", "k");
  assert.equal(client.defaults.baseURL, "https://api-trial.cognigy.ai");
});

test("buildApiClient preserves an explicit http:// scheme", () => {
  const client = buildApiClient("http://localhost:8080", "k");
  assert.equal(client.defaults.baseURL, "http://localhost:8080");
});

test("buildApiClient throws a clear error when the base URL is missing", () => {
  assert.throws(() => buildApiClient("", "k"), /base URL is missing/);
});

test("buildApiClient throws a clear error when the API key is missing", () => {
  assert.throws(() => buildApiClient("https://x.cognigy.ai", "  "), /API key is missing/);
});

// ---------------------------------------------------------------------------
// describeError
// ---------------------------------------------------------------------------

test("describeError formats an API error response with a message field", () => {
  const err = { response: { status: 401, data: { message: "Unauthorized" } } };
  assert.equal(describeError(err), "HTTP 401: Unauthorized");
});

test("describeError formats an API error response with an error field", () => {
  const err = { response: { status: 404, data: { error: "Not found" } } };
  assert.equal(describeError(err), "HTTP 404: Not found");
});

test("describeError stringifies an unstructured error body", () => {
  const err = { response: { status: 500, data: { foo: "bar" } } };
  assert.equal(describeError(err), 'HTTP 500: {"foo":"bar"}');
});

test("describeError falls back to the error message", () => {
  assert.equal(describeError(new Error("socket hang up")), "socket hang up");
});

test("describeError stringifies a primitive", () => {
  assert.equal(describeError("boom"), "boom");
});
