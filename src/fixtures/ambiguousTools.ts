import type { McpToolDefinition } from "../types/mcpTool.js";

export const ambiguousTools: McpToolDefinition[] = [
  {
    name: "list_files",
    description: "List files in the workspace.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "list_file_versions",
    description: "List file versions for the current file.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "list_folders",
    description: "List folders in the workspace.",
    inputSchema: {
      type: "object",
      properties: {}
    },
    annotations: { readOnlyHint: true }
  }
];
