# Connection Management

A Cognigy Extension for working with [Connections](https://docs.cognigy.com/ai/platform-features/connections)
from within a Flow, read their decrypted values, update the values inside them,
and list them. Handy for storing and rotating auth tokens and other credentials.

## Connection schemas

This extension defines three connection schemas. FYI, the extension does not need a separate create, you create the connection within the node itself.

| Schema | `type` | Fields |
| ------ | ------ | ------ |
| Token store | `auth-token` | `accessToken`, `expiresAt`, `refreshToken` |
| Credentials store | `auth-credentials` | `clientId`, `clientSecret`, `tokenUrl`, `scope` |
| Data store | `auth-data` | `value1` … `value6` (free-form slots) |

A typical setup keeps them split, e.g. per API: one Credentials store (static
client id/secret + token endpoint) and one Token store (the rotating access
token + expiry). The Data store is a general-purpose bucket for non-uniform
values.

## How it works

Two mechanisms, because Cognigy exposes connections two ways:

1. **Connection binding**: a connection *field* on a node. At runtime Cognigy
   injects the connection's **decrypted** values into the node (exactly as for a
   built-in HTTP Request node). This is the only way to read real secret values.
   Used by the **Get … Values** nodes. No API key needed.
2. **Management REST API**: for updating, listing, and inspecting connections.
   Authenticated with a Cognigy API key stored in the `cognigy-api` Connection.
   Note the API **masks secret values as `****`** in responses.

### Prerequisites (for the API-based nodes)

- A **Cognigy API key** with permission to manage Connections.
- The **base URL** of your Cognigy API (e.g. `https://api-trial.cognigy.ai`).

Both live in this extension's `cognigy-api` Connection. The API-based nodes need
the connection's Mongo `_id` (24-hex), **not** the `referenceId` (UUID) — use
**List Connections** to discover it.

## Nodes

### Get Token Values / Get Credentials Values / Get Data Values

Read a connection via a **binding** — pick the connection on the node (or create
one with `+`) and its **decrypted** values are written to `input`/`context`. Use
these whenever the flow needs real values (`accessToken`, `clientSecret`, …).

### List Connections

Returns connections to `input`/`context`: a `connections` summary and a full
`items` array, each with the Mongo `_id` injected. Optional name filter and
project/organisation scope. Use it to discover the `_id` for the Update nodes.

### Read Connection (metadata — secrets masked)

Reads a connection by `_id` via the API. Secret values come back masked as
`****`, so use it for metadata inspection; use the Get … Values nodes for real
values.

### Update Token / Update Credentials / Update Data Connection

Write values into a connection by `_id` via `PATCH /v2.0/connections/{id}`. Each
node shows the target schema's **named fields** — fill only the ones you want to
change (blanks are skipped). Requires the `cognigy-api` Connection and the
connection's `_id`.

## Example: token refresh loop

1. **Get Token Values** → read `accessToken` + `expiresAt` (decrypted).
2. Check whether the token is expired.
3. If expired: **Get Credentials Values** → read `clientId`/`clientSecret`/`tokenUrl`.
4. **HTTP Request** node → call the token endpoint for a new token.
5. **Update Token Connection** → write the new `accessToken` + `expiresAt`.

## Known limitations & notes

- **`PATCH` merge vs. replace**: the Update nodes send only the fields you fill
  in. This is correct if Cognigy's `PATCH` merges (updates just those keys). If
  it replaces the whole field set, fill every field you want to keep. Confirm
  with a quick test on your tenant.
- Connections created via the `+` button are made at **design time**; there is
  no runtime/programmatic connection creation.
- The API key in the `cognigy-api` Connection grants connection-management
  rights — scope it as narrowly as your tenant allows.

## Build

```bash
npm install
npm test           # run the unit tests (Node's built-in test runner)
npm run build      # transpile + lint + package into a .tar.gz
```

The resulting archive can be uploaded to Cognigy as a custom Extension.
