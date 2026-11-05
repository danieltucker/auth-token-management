# Connection Management Extension: Overview

A quick guide to what this Cognigy Extension does and how the code is put together.
For step-by-step usage, screenshots and the token-refresh example, see [README.md](README.md).

## What it does

It lets a Flow use Cognigy **Connections** as a small, encrypted key/value store:

- **Read** a connection's real (decrypted) values at runtime, for example an access token or client secret.
- **Update** a connection's values from inside a Flow, for example after refreshing an OAuth token.
- **List / inspect** connections, mainly so the Flow can find the `_id`s it needs to update.

The typical use is storing and rotating auth tokens without hardcoding secrets in Flows.

## The two mechanisms

Cognigy exposes connections in two different ways, and the extension needs both:

| Mechanism | Used by | Returns secrets? | Needs API key? |
| --- | --- | --- | --- |
| **Connection binding**: a `connection` field on a node. Cognigy injects the decrypted values into `config.connection` at runtime. | Get … Values nodes | Yes, decrypted | No |
| **Management REST API** (`/v2.0/connections`), authenticated with `X-API-Key` | List, Read, Update nodes | No, masked as `****` | Yes, via the `cognigy-api` connection |

So reads go through bindings and writes go through the API. The API can't be used for reads because it masks secrets.

## Connection schemas

Defined in [src/lib/schemas.ts](src/lib/schemas.ts) and registered in [src/connections/](src/connections/):

| Schema | `type` | Fields |
| --- | --- | --- |
| Cognigy API | `cognigy-api` | `apiKey`, `baseUrl` |
| Token store | `auth-token` | `accessToken`, `expiresAt`, `refreshToken` |
| Credentials store | `auth-credentials` | `clientId`, `clientSecret`, `tokenUrl`, `scope` |
| Data store | `auth-data` | `value1` … `value6` |

All field values must be strings, including numbers and booleans.

## Nodes

| Node | How it works |
| --- | --- |
| **Get Token / Credentials / Data Values** | Built by `makeGetValuesNode` ([src/lib/getValuesNode.ts](src/lib/getValuesNode.ts)). Copies the bound connection's decrypted fields into `input` or `context`. Makes no API call. |
| **List Connections** ([src/nodes/listConnections.ts](src/nodes/listConnections.ts)) | `GET /v2.0/connections` with optional `filter`, `projectId` or organisation scope, `limit` ≤ 100. Finds the item array wherever it sits in the response and injects `_id`, parsed from `_links.self.href`, onto each item. |
| **Read Connection** ([src/nodes/readConnection.ts](src/nodes/readConnection.ts)) | `GET /v2.0/connections/{id}`. Flattens `fields` into a plain object. Secrets come back masked, so this is for metadata only. |
| **Update Token / Credentials / Data Connection** | Built by `makeUpdateConnectionNode` ([src/lib/updateNode.ts](src/lib/updateNode.ts)). Sends `PATCH /v2.0/connections/{id}` with only the non-blank fields. |

### Update flow in detail

1. `parseConnectionIds` splits the **Connection ID(s)** input, which can be a single id, a comma list, or a CognigyScript array, into valid 24-hex ids and invalid ones.
2. `pickFields` keeps only the schema fields that were filled in, so you can update a subset, such as just `accessToken`.
3. The valid ids are shuffled, then `updateConnections` PATCHes each in turn. A failure on one id doesn't stop the rest.
4. The result `{ total, updatedCount, failedCount, updated[], failed[] }` is stored. Invalid ids are added as failures.
5. Partial failure is logged and the Flow continues. If **every** update fails, the node follows **On Error**: it either throws, or stores the result with an `error` message.

Ids are shuffled so that if a run is cut short, such as by a runtime limit, repeated runs eventually reach every connection.

## Shared code

| File | Purpose |
| --- | --- |
| [src/module.ts](src/module.ts) | Registers all connections and nodes with `createExtension`. |
| [src/lib/apiClient.ts](src/lib/apiClient.ts) | `buildApiClient`: an axios instance with the `X-API-Key` header. It trims trailing slashes, adds `https://` if missing, and never throws on non-2xx responses. `describeError` formats errors as `HTTP <status>: <message>`. |
| [src/lib/nodeHelpers.ts](src/lib/nodeHelpers.ts) | `storeResult` (writes to input or context), `parseConnectionIds`, `shuffle`, `updateConnections`, `pickFields`, `flattenFields`, `normalizeFields`. |

Every API node has the same **Storage & Error Handling** options: where to store the result (`input` or `context`), the result key, and On Error (`stop` or `continue`).

## Things to know

- Update nodes need the connection's Mongo **`_id`** (24 hex characters), not its `referenceId` (a UUID). Use List Connections to find it.
- **Snapshot restores create new `_id`s** and can leave duplicate copies of a connection. Look ids up at runtime by name, then update all of them. Don't hardcode ids.
- Connections can only be created at design time, using the `+` on a node's connection field.
- The `cognigy-api` key can manage connections, so scope it as narrowly as you can.

## Build & test

```bash
npm install
npm test        # transpile + node --test test/*.test.js
npm run build   # transpile + lint + package to auth-token-in-connection.tar.gz
```

Upload the `.tar.gz` to Cognigy as a custom Extension.
