import type { McpToolDefinition } from "../types/mcpTool.js";

export const databaseLikeTools: McpToolDefinition[] = [
  {
    name: "list_tables",
    description: "List tables in the connected database.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "describe_table",
    description: "Describe a table by name.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" }
      }
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "count_rows",
    description: "Count rows in the current database.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "run_query",
    description: "Run an SQL query.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" }
      }
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true
    }
  }
];

export const databaseLikeMatches = [
  "list tables",
  "describe table users",
  "count rows"
];

export const databaseLikeFallbacks = [
  "run query select * from users",
  "delete from users where id = 1",
  "show me the table with the most users"
];
