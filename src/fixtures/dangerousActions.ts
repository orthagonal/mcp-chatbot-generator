import type { McpToolDefinition } from "../types/mcpTool.js";

export const dangerousActionsTools: McpToolDefinition[] = [
  {
    name: "send_email",
    description: "Send an email message.",
    inputSchema: {
      type: "object",
      required: ["to", "subject"],
      properties: {
        to: { type: "string" },
        subject: { type: "string" }
      }
    }
  },
  {
    name: "delete_file",
    description: "Delete a file path.",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: {
        path: { type: "string" }
      }
    },
    annotations: {
      destructiveHint: true
    }
  },
  {
    name: "deploy_project",
    description: "Deploy a project.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" }
      }
    }
  },
  {
    name: "purchase_item",
    description: "Purchase an item.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" }
      }
    }
  }
];
