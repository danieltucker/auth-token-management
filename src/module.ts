import { createExtension } from "@cognigy/extension-tools";
import { cognigyApiConnection } from "./connections/cognigyApiConnection";
import { tokenStoreConnection } from "./connections/tokenStoreConnection";
import { credentialsStoreConnection } from "./connections/credentialsStoreConnection";
import { dataStoreConnection } from "./connections/dataStoreConnection";
import { listConnections } from "./nodes/listConnections";
import { readConnection } from "./nodes/readConnection";
import { getTokenValues } from "./nodes/getTokenValues";
import { getCredentialsValues } from "./nodes/getCredentialsValues";
import { getDataValues } from "./nodes/getDataValues";
import { updateTokenConnection } from "./nodes/updateTokenConnection";
import { updateCredentialsConnection } from "./nodes/updateCredentialsConnection";
import { updateDataConnection } from "./nodes/updateDataConnection";

export default createExtension({
  connections: [
    cognigyApiConnection,
    tokenStoreConnection,
    credentialsStoreConnection,
    dataStoreConnection
  ],
  nodes: [
    listConnections,
    readConnection,
    getTokenValues,
    getCredentialsValues,
    getDataValues,
    updateTokenConnection,
    updateCredentialsConnection,
    updateDataConnection
  ],
  options: { label: "Connection Management" }
});
