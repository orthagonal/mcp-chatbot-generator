import type { McpToolDefinition } from "../types/mcpTool.js";

export const docsProjectsTools: McpToolDefinition[] = [
  {
    name: "list_documents",
    title: "List Documents",
    description: "List documents in the current workspace.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
        folderId: { type: "string" }
      }
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "search_documents",
    title: "Search Documents",
    description: "Search documents by text query.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        limit: { type: "number", default: 10 }
      }
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "get_document",
    title: "Get Document",
    description: "Read a single document by ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" }
      }
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "delete_document",
    title: "Delete Document",
    description: "Delete a document by ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" }
      }
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true
    }
  },
  {
    name: "list_projects",
    title: "List Projects",
    description: "List all projects.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 }
      }
    },
    annotations: { readOnlyHint: true }
  }
];

export const docsProjectsMatches = [
  "help",
  "?",
  "list docs",
  "list all docs",
  "show docs",
  "list documents",
  "search docs shader",
  "find documents webgpu",
  "get doc abc123",
  "open document abc123",
  "list projects",
  "show projects"
];

export const docsProjectsFallbacks = [
  "delete doc abc123",
  "remove document abc123",
  "summarize all docs",
  "compare docs",
  "search docs and make a report"
];
