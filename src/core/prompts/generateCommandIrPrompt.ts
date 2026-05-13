import type { CompileOptions } from "../../types/compileOptions.js";
import type { McpToolDefinition } from "../../types/mcpTool.js";

export function buildGenerateCommandIrPrompt(input: {
  tools: McpToolDefinition[];
  options: CompileOptions;
}): string {
  return [
    "You are generating a conservative command grammar for MCP tools.",
    "",
    "Input:",
    "- Tool names",
    "- Tool descriptions",
    "- JSON Schemas",
    "- Safety annotations if available",
    "",
    "Output:",
    "- Command IR JSON only",
    "- No executable code",
    "- No markdown",
    "- Only include exact, prefix, or simple regex matchers",
    "- Prefer exact and prefix matchers",
    "- Do not include destructive tools unless explicitly allowed",
    "- If a command is ambiguous, omit it",
    "- If required arguments cannot be filled by defaults or captures, omit the tool",
    "",
    "Compile options:",
    JSON.stringify(input.options, null, 2),
    "",
    "Tools:",
    JSON.stringify(input.tools, null, 2)
  ].join("\n");
}
