import type { ProposeSelfImproveFixInput, SelfImproveWorkspaceFile } from "./types.js";
import type { GenerateSelfImproveTestSpecInput } from "./types.js";

function formatWorkspaceFiles(files: SelfImproveWorkspaceFile[]): string {
  return files
    .map((file) =>
      [
        `FILE: ${file.path}`,
        "```ts",
        file.content,
        "```"
      ].join("\n")
    )
    .join("\n\n");
}

export function buildSelfImproveTestSpecPrompt(
  input: GenerateSelfImproveTestSpecInput
): string {
  return [
    "You are generating a conservative unit-test specification for mcp-command-compiler.",
    "Return JSON only. Do not wrap the response in markdown fences.",
    "",
    "Output JSON shape:",
    `{
  "title": string,
  "rationale"?: string,
  "options"?: {
    "namespace"?: string,
    "allowWriteCommands"?: boolean,
    "allowDestructiveCommands"?: boolean,
    "requireConfirmationForWrites"?: boolean,
    "includeRegexMatchers"?: boolean,
    "maxAliasesPerTool"?: number
  },
  "tools": [
    {
      "name": string,
      "title"?: string,
      "description"?: string,
      "inputSchema": object,
      "outputSchema"?: object,
      "annotations"?: {
        "readOnlyHint"?: boolean,
        "destructiveHint"?: boolean,
        "idempotentHint"?: boolean,
        "openWorldHint"?: boolean
      }
    }
  ],
  "matches": [
    {
      "input": string,
      "toolName"?: string,
      "args"?: object,
      "source"?: "exact" | "prefix" | "regex" | "builtin",
      "requiresConfirmation"?: boolean
    }
  ],
  "fallbacks": [
    {
      "input": string,
      "reasonIncludes"?: string
    }
  ]
}`,
    "",
    "Rules:",
    "- Convert the provided Zod schema source into MCP-style tool definitions that use JSON-schema-like inputSchema objects, not Zod runtime values.",
    "- Infer tool names and descriptions from symbol names, comments, or nearby metadata when they are not explicit.",
    "- Keep expectations conservative and deterministic.",
    "- Prefer obvious commands like list/show/count/get/describe/search forms.",
    "- Put ambiguous, chained, destructive, or overly broad requests in fallbacks.",
    "- Only set compile options if they are clearly necessary for the desired deterministic behavior.",
    "- Include at least one match and at least one fallback.",
    "",
    `Schema source location: ${input.schema.resolvedLocation}`,
    input.toolName ? `Tool name hint: ${input.toolName}` : "Tool name hint: none",
    input.toolDescription
      ? `Tool description hint: ${input.toolDescription}`
      : "Tool description hint: none",
    "",
    "Schema source:",
    "```ts",
    input.schema.source,
    "```"
  ].join("\n");
}

export function buildSelfImproveFixPrompt(
  input: ProposeSelfImproveFixInput
): string {
  return [
    "You are repairing mcp-command-compiler after a generated unit test failed.",
    "Return JSON only. Do not wrap the response in markdown fences.",
    "",
    "Output JSON shape:",
    `{
  "status": "fix" | "give_up",
  "summary": string,
  "updatedSpec"?: {
    "title": string,
    "rationale"?: string,
    "options"?: object,
    "tools": array,
    "matches": array,
    "fallbacks": array
  },
  "fileUpdates": [
    {
      "path": string,
      "content": string
    }
  ]
}`,
    "",
    "Rules:",
    "- Prefer minimal, high-confidence fixes.",
    `- You may only edit files under src/ or the generated test file at ${input.testPath}.`,
    "- Return full file contents for each changed file.",
    "- Prefer fixing compiler code when the expected behavior is reasonable.",
    "- If the generated test spec was too aggressive or invalid, you may return an updatedSpec.",
    "- If you cannot propose a confident fix, return status=\"give_up\" with an explanation and no file updates.",
    "",
    `Attempt: ${input.attempt} of ${input.maxIterations}`,
    `Schema source location: ${input.schema.resolvedLocation}`,
    input.toolName ? `Tool name hint: ${input.toolName}` : "Tool name hint: none",
    input.toolDescription
      ? `Tool description hint: ${input.toolDescription}`
      : "Tool description hint: none",
    "",
    "Current structured test spec:",
    "```json",
    JSON.stringify(input.currentSpec, null, 2),
    "```",
    "",
    "Current generated test source:",
    "```ts",
    input.currentTestSource,
    "```",
    "",
    "Failure output:",
    "```text",
    input.failureOutput,
    "```",
    "",
    "Relevant workspace files:",
    formatWorkspaceFiles(input.workspaceFiles)
  ].join("\n");
}
