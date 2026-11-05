import { makeGetValuesNode } from "../lib/getValuesNode";
import { DATA_SCHEMA } from "../lib/schemas";

export const getDataValues = makeGetValuesNode({
  type: "getDataValues",
  defaultLabel: "Get Data Values",
  summary: "Reads a data store connection's decrypted values (value1…value6)",
  schema: DATA_SCHEMA,
  defaultResultKey: "data"
});
