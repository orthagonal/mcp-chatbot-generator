import type { McpToolDefinition } from "../types/mcpTool.js";

export const githubLikeTools: McpToolDefinition[] = [
  {
    name: "list_repositories",
    description: "List repositories visible to the current user.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 25 }
      }
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "list_issues",
    description: "List issues in the current repository.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 25 }
      }
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "get_issue",
    description: "Get a single issue by number.",
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
    name: "search_pull_requests",
    description: "Search pull requests with a text query.",
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
    name: "create_issue",
    description: "Create an issue.",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" }
      }
    }
  },
  {
    name: "comment_on_issue",
    description: "Add a comment to an issue.",
    inputSchema: {
      type: "object",
      required: ["issueId", "body"],
      properties: {
        issueId: { type: "string" },
        body: { type: "string" }
      }
    }
  },
  {
    name: "close_issue",
    description: "Close an issue.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" }
      }
    }
  }
];

export const githubLikeMatches = [
  "list repos",
  "list repositories",
  "list issues",
  "get issue 123",
  "search prs auth bug",
  "search pull requests login"
];

export const githubLikeFallbacks = [
  "create issue about login bug",
  "comment on issue 123",
  "close issue 123"
];
