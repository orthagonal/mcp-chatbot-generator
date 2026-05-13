import type { CommandIr, CommandToolIr } from "../types/commandIr.js";
import { humanizeToolName } from "./normalize.js";
import { pickGroupLabel } from "./shared.js";

function groupTools(tools: CommandToolIr[]): Map<string, CommandToolIr[]> {
  const groups = new Map<string, CommandToolIr[]>();

  for (const tool of tools) {
    const label = pickGroupLabel(tool.command.nouns);
    const current = groups.get(label) ?? [];
    current.push(tool);
    groups.set(label, current);
  }

  return groups;
}

export function generateHelpMarkdown(ir: CommandIr): string {
  const lines: string[] = ["# MCP Command Help", ""];

  lines.push("## Built-in commands", "");

  for (const builtin of ir.builtins) {
    for (const alias of builtin.aliases) {
      lines.push(`- \`${alias}\``);
    }
  }

  lines.push("", "Show this help page.", "");

  for (const [groupName, tools] of groupTools(ir.tools)) {
    lines.push(`## ${groupName}`, "");

    for (const tool of tools) {
      lines.push(`### ${humanizeToolName(tool.toolName)}`, "");
      lines.push(tool.help.summary, "");

      for (const usage of tool.help.usage) {
        lines.push(`- \`${usage}\``);
      }

      lines.push("");

      if (tool.command.examples.length > 0) {
        lines.push("Examples:", "");

        for (const example of tool.command.examples) {
          lines.push(`- \`${example}\``);
        }

        lines.push("");
      }

      lines.push(`Calls \`${tool.toolName}\`.`, "");
    }
  }

  lines.push(
    "## Fallback behavior",
    "",
    "Messages that do not exactly match one of these commands should be sent to the LLM."
  );

  return `${lines.join("\n").trim()}\n`;
}
