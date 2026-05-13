import type { CommandIntent } from "../types/commandIr.js";
import type { McpJsonSchema, McpToolDefinition } from "../types/mcpTool.js";
import { normalizeCommand, pluralize, singularize } from "./normalize.js";

export const intentPrefixes: Record<string, CommandIntent> = {
  list: "list",
  search: "search",
  find: "search",
  get: "get",
  read: "get",
  open: "get",
  describe: "describe",
  count: "count",
  create: "create",
  update: "update",
  delete: "delete",
  remove: "delete",
  run: "run",
  execute: "run"
};

export const readOnlyIntents = new Set<CommandIntent>([
  "list",
  "get",
  "search",
  "describe",
  "count"
]);

export const destructiveIntents = new Set<CommandIntent>([
  "delete",
  "run",
  "update"
]);

export const intentVerbs: Record<CommandIntent, string[]> = {
  list: ["list", "show"],
  search: ["search", "find"],
  get: ["get", "open", "read"],
  describe: ["describe"],
  count: ["count"],
  create: ["create"],
  update: ["update"],
  delete: ["delete", "remove"],
  run: ["run", "execute"],
  help: ["help"]
};

export const nounSynonyms: Record<string, string[]> = {
  documents: ["docs", "documents"],
  document: ["doc", "document"],
  repositories: ["repos", "repositories"],
  repository: ["repo", "repository"],
  pull_requests: ["prs", "pull requests", "pull-requests"],
  pull_request: ["pr", "pull request", "pull-request"],
  issues: ["issues"],
  issue: ["issue"],
  projects: ["projects"],
  project: ["project"],
  tables: ["tables"],
  table: ["table"],
  rows: ["rows"],
  row: ["row"],
  files: ["files"],
  file: ["file"],
  folders: ["folders"],
  folder: ["folder"]
};

export const idLikeArgumentNames = new Set([
  "id",
  "name",
  "key",
  "slug",
  "path",
  "identifier",
  "table"
]);

export function detectIntent(toolName: string): {
  intent: CommandIntent;
  suffix: string;
} | null {
  const match = /^([a-z]+)[_-](.+)$/.exec(toolName.trim().toLowerCase());
  if (!match) return null;

  const prefix = match[1];
  const suffix = match[2];
  const intent = intentPrefixes[prefix];
  if (!intent) return null;

  return { intent, suffix };
}

export function schemaProperties(schema: McpJsonSchema): Record<string, McpJsonSchema> {
  return schema.properties ?? {};
}

export function schemaRequired(schema: McpJsonSchema): string[] {
  return schema.required ?? [];
}

export function extractDefaults(
  schema: McpJsonSchema
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const [name, property] of Object.entries(schemaProperties(schema))) {
    if (Object.prototype.hasOwnProperty.call(property, "default")) {
      defaults[name] = property.default;
    }
  }

  return defaults;
}

export function isToolReadOnly(
  tool: McpToolDefinition,
  intent: CommandIntent
): boolean {
  return tool.annotations?.readOnlyHint === true || readOnlyIntents.has(intent);
}

export function isToolDestructive(
  tool: McpToolDefinition,
  intent: CommandIntent
): boolean {
  return (
    tool.annotations?.destructiveHint === true || destructiveIntents.has(intent)
  );
}

export function normalizeToolNouns(
  suffix: string,
  intent: CommandIntent
): string[] {
  const synonyms = nounSynonyms[suffix] ?? [suffix.replace(/[_-]+/g, " ")];
  const transformed = synonyms.flatMap((noun) => {
    const normalized = normalizeCommand(noun.replace(/[_-]+/g, " "));

    if (
      intent === "list" ||
      intent === "search" ||
      intent === "count" ||
      suffix.endsWith("s")
    ) {
      return [pluralize(normalized)];
    }

    if (intent === "get" || intent === "describe" || intent === "delete") {
      return [singularize(normalized)];
    }

    return [normalized];
  });

  return [...new Set(transformed)];
}

export function getCaptureType(
  schema: McpJsonSchema | undefined
): "string" | "number" | "boolean" {
  if (schema?.type === "number" || schema?.type === "integer") return "number";
  if (schema?.type === "boolean") return "boolean";
  return "string";
}

export function choosePrimaryCaptureArg(
  intent: CommandIntent,
  required: string[],
  properties: Record<string, McpJsonSchema>
): string | null {
  if (intent === "search") {
    return required.includes("query") && properties.query ? "query" : null;
  }

  if (intent === "get" || intent === "describe" || intent === "delete") {
    const candidates = required.filter(
      (name) => properties[name] && idLikeArgumentNames.has(name)
    );
    return candidates[0] ?? null;
  }

  return null;
}

export function pickSummary(tool: McpToolDefinition): string {
  return (
    tool.description?.trim() ||
    tool.title?.trim() ||
    `Call ${tool.name}.`
  );
}

export function pickGroupLabel(nouns: string[]): string {
  const longest = [...nouns].sort((left, right) => right.length - left.length)[0];
  if (!longest) return "Commands";

  return pluralize(longest).replace(/\b\w/g, (char) => char.toUpperCase());
}

export function compoundInstructionPattern(): RegExp {
  return /\b(and|then)\s+(list|show|get|open|read|describe|count|create|update|delete|remove|send|publish|deploy|purchase|email|invite|transfer|execute|run|make|summarize|compare|report)\b/;
}
