import { makeUpdateConnectionNode } from "../lib/updateNode";
import { DATA_SCHEMA } from "../lib/schemas";

export const updateDataConnection = makeUpdateConnectionNode({
  type: "updateDataConnection",
  defaultLabel: "Update Data Connection",
  summary: "Updates a data store connection (fill only the slots you want to change)",
  schema: DATA_SCHEMA,
  valueFields: [
    { key: "value1", label: "Value 1" },
    { key: "value2", label: "Value 2" },
    { key: "value3", label: "Value 3" },
    { key: "value4", label: "Value 4" },
    { key: "value5", label: "Value 5" },
    { key: "value6", label: "Value 6" }
  ]
});
