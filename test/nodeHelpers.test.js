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
