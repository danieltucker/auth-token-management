const { test } = require("node:test");
const assert = require("node:assert/strict");

const { normalizeFields, flattenFields, storeResult, pickFields } = require("../build/lib/nodeHelpers");

// ---------------------------------------------------------------------------
// normalizeFields
// ---------------------------------------------------------------------------

test("normalizeFields passes through a plain object", () => {
  const input = { client_id: "abc", client_secret: "xyz" };
  assert.deepEqual(normalizeFields(input), input);
});

test("normalizeFields parses a JSON string", () => {
  assert.deepEqual(normalizeFields('{"token":"t1"}'), { token: "t1" });
});

test("normalizeFields parses a JSON string with surrounding whitespace", () => {
  assert.deepEqual(normalizeFields('  { "a": 1 }  '), { a: 1 });
});

test("normalizeFields throws on an empty string", () => {
  assert.throws(() => normalizeFields("   "), /empty/);
});

test("normalizeFields throws on invalid JSON", () => {
  assert.throws(() => normalizeFields("{not json}"), /not valid JSON/);
});

test("normalizeFields throws on an array", () => {
  assert.throws(() => normalizeFields([1, 2, 3]), /name\/value pairs/);
});

test("normalizeFields throws on a JSON array string", () => {
  assert.throws(() => normalizeFields("[1,2]"), /name\/value pairs/);
});

test("normalizeFields throws on null", () => {
  assert.throws(() => normalizeFields(null), /name\/value pairs/);
});

test("normalizeFields throws on a number", () => {
  assert.throws(() => normalizeFields(42), /name\/value pairs/);
});

// ---------------------------------------------------------------------------
// pickFields
// ---------------------------------------------------------------------------

test("pickFields keeps only the requested non-empty string keys", () => {
  const source = { accessToken: "abc", expiresAt: "123", refreshToken: "", other: "ignored" };
  assert.deepEqual(pickFields(source, ["accessToken", "expiresAt", "refreshToken"]), {
    accessToken: "abc",
    expiresAt: "123"
  });
});

test("pickFields omits blank/whitespace and non-string values", () => {
  const source = { a: "  ", b: "ok", c: undefined, d: 5 };
  assert.deepEqual(pickFields(source, ["a", "b", "c", "d"]), { b: "ok" });
});

test("pickFields returns {} when nothing matches", () => {
  assert.deepEqual(pickFields({ x: "1" }, ["a", "b"]), {});
});

// ---------------------------------------------------------------------------
// flattenFields
// ---------------------------------------------------------------------------

test("flattenFields converts an array of {key,value} into a map", () => {
  const input = [
    { key: "token", value: "t1", _id: "x" },
    { key: "expires", value: 123 }
  ];
  assert.deepEqual(flattenFields(input), { token: "t1", expires: 123 });
});

test("flattenFields ignores array entries without a string key", () => {
  const input = [{ value: "orphan" }, { key: "ok", value: 1 }];
  assert.deepEqual(flattenFields(input), { ok: 1 });
});

test("flattenFields passes through a plain object", () => {
  assert.deepEqual(flattenFields({ a: 1 }), { a: 1 });
});

test("flattenFields returns {} for null/undefined/non-object", () => {
  assert.deepEqual(flattenFields(null), {});
  assert.deepEqual(flattenFields(undefined), {});
  assert.deepEqual(flattenFields("nope"), {});
});

// ---------------------------------------------------------------------------
// storeResult
// ---------------------------------------------------------------------------

function makeApiSpy() {
  const calls = [];
  return {
    calls,
    addToInput: (key, value) => calls.push(["input", key, value]),
    addToContext: (key, value, mode) => calls.push(["context", key, value, mode])
  };
}

test("storeResult writes to input", () => {
  const api = makeApiSpy();
  storeResult(api, "input", "connection", { _id: "1" });
  assert.deepEqual(api.calls, [["input", "connection", { _id: "1" }]]);
});

test("storeResult writes to context with simple mode", () => {
  const api = makeApiSpy();
  storeResult(api, "context", "myKey", { _id: "1" });
  assert.deepEqual(api.calls, [["context", "myKey", { _id: "1" }, "simple"]]);
});

test("storeResult is a no-op when the target key is empty", () => {
  const api = makeApiSpy();
  storeResult(api, "input", "", { _id: "1" });
  assert.deepEqual(api.calls, []);
});

// ---------------------------------------------------------------------------
// parseConnectionIds
// ---------------------------------------------------------------------------

const { parseConnectionIds, updateConnections } = require("../build/lib/nodeHelpers");

const ID_A = "6a886d4bd9adb69ed8d18eba";
const ID_B = "6abe15c1eec04a04502a05b4";

test("parseConnectionIds accepts a single id", () => {
  assert.deepEqual(parseConnectionIds(ID_A), { valid: [ID_A], invalid: [] });
});

test("parseConnectionIds splits a comma-separated list and trims spaces", () => {
  assert.deepEqual(parseConnectionIds(` ${ID_A} , ${ID_B} `), { valid: [ID_A, ID_B], invalid: [] });
});

test("parseConnectionIds tolerates a JSON-style array string", () => {
  assert.deepEqual(parseConnectionIds(`["${ID_A}","${ID_B}"]`), { valid: [ID_A, ID_B], invalid: [] });
});

test("parseConnectionIds accepts a real array", () => {
  assert.deepEqual(parseConnectionIds([ID_A, ID_B]), { valid: [ID_A, ID_B], invalid: [] });
});

test("parseConnectionIds de-duplicates and skips empty entries", () => {
  assert.deepEqual(parseConnectionIds(`${ID_A},,${ID_A},`), { valid: [ID_A], invalid: [] });
});

test("parseConnectionIds separates malformed ids", () => {
  assert.deepEqual(parseConnectionIds(`${ID_A},not-an-id`), { valid: [ID_A], invalid: ["not-an-id"] });
});

test("parseConnectionIds returns empty lists for blank/missing input", () => {
  assert.deepEqual(parseConnectionIds("  "), { valid: [], invalid: [] });
  assert.deepEqual(parseConnectionIds(undefined), { valid: [], invalid: [] });
});

// ---------------------------------------------------------------------------
// updateConnections
// ---------------------------------------------------------------------------

function makeClient(statusById) {
  const calls = [];
  return {
    calls,
    request: async (config) => {
      calls.push(config);
      const id = config.url.split("/").pop();
      const status = statusById[id];
      if (status instanceof Error) {
        throw status;
      }
      return { status, data: status >= 300 ? { message: "Not found" } : {} };
    }
  };
}

test("updateConnections PATCHes every id with the same fields", async () => {
  const client = makeClient({ [ID_A]: 200, [ID_B]: 204 });
  const result = await updateConnections(client, [ID_A, ID_B], { accessToken: "t" });
  assert.deepEqual(client.calls.map((c) => [c.method, c.url, c.data]), [
    ["PATCH", `/v2.0/connections/${ID_A}`, { fields: { accessToken: "t" } }],
    ["PATCH", `/v2.0/connections/${ID_B}`, { fields: { accessToken: "t" } }]
  ]);
  assert.deepEqual(result, {
    total: 2,
    updatedCount: 2,
    failedCount: 0,
    updated: [{ id: ID_A, status: 200 }, { id: ID_B, status: 204 }],
    failed: []
  });
});

test("updateConnections keeps going after a failure and reports it", async () => {
  const client = makeClient({ [ID_A]: 404, [ID_B]: 200 });
  const result = await updateConnections(client, [ID_A, ID_B], { accessToken: "t" });
  assert.equal(client.calls.length, 2);
  assert.deepEqual(result.updated, [{ id: ID_B, status: 200 }]);
  assert.deepEqual(result.failed, [{ id: ID_A, error: "HTTP 404: Not found" }]);
});

test("updateConnections records thrown network errors", async () => {
  const client = makeClient({ [ID_A]: new Error("socket hang up") });
  const result = await updateConnections(client, [ID_A], { accessToken: "t" });
  assert.deepEqual(result.failed, [{ id: ID_A, error: "socket hang up" }]);
  assert.equal(result.updatedCount, 0);
});

// ---------------------------------------------------------------------------
// shuffle
// ---------------------------------------------------------------------------

const { shuffle } = require("../build/lib/nodeHelpers");

test("shuffle returns the same items without mutating the input", () => {
  const input = [1, 2, 3, 4, 5];
  const result = shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...result].sort(), [1, 2, 3, 4, 5]);
});

test("shuffle eventually produces a different order", () => {
  const input = [1, 2, 3, 4, 5];
  const orders = new Set(Array.from({ length: 50 }, () => shuffle(input).join(",")));
  assert.ok(orders.size > 1);
});
