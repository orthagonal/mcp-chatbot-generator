import type { CompileOptions } from "../types/compileOptions.js";
import type { CommandIr } from "../types/commandIr.js";
import type { McpToolDefinition } from "../types/mcpTool.js";
import type { ValidationResult } from "../types/validation.js";
import { resolveCompileOptions } from "./options.js";
import {
  detectIntent,
  isToolDestructive,
  isToolReadOnly,
  schemaProperties,
  schemaRequired
} from "./shared.js";

export function validateCommandIr(
  ir: CommandIr,
  tools: McpToolDefinition[],
  options?: CompileOptions
): ValidationResult {
  const resolved = resolveCompileOptions(options);
  const errors: string[] = [];
  const warnings: string[] = [];
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
  const exactPhrases = new Map<string, string>();
  const prefixPhrases = new Map<string, string>();

  if (ir.version !== 1) {
    errors.push(`Unsupported Command IR version: ${ir.version}.`);
  }

  for (const builtin of ir.builtins) {
    for (const alias of builtin.aliases) {
      if (exactPhrases.has(alias)) {
        errors.push(`Duplicate exact phrase detected: "${alias}".`);
      } else {
        exactPhrases.set(alias, "__builtin__");
      }
    }
  }

  for (const commandTool of ir.tools) {
    const tool = toolMap.get(commandTool.toolName);
    if (!tool) {
      errors.push(`Tool "${commandTool.toolName}" does not exist in source tools.`);
      continue;
    }

    const detected = detectIntent(tool.name);
    if (!detected) {
      warnings.push(`Tool "${tool.name}" appears in IR without a recognized intent.`);
      continue;
    }

    const readOnly = isToolReadOnly(tool, detected.intent);
    const destructive = isToolDestructive(tool, detected.intent);

    if (!readOnly && !resolved.allowWriteCommands) {
      errors.push(`Write tool "${tool.name}" is present but write commands are disabled.`);
    }

    if (destructive && !resolved.allowDestructiveCommands) {
      errors.push(
        `Destructive tool "${tool.name}" is present but destructive commands are disabled.`
      );
    }

    const properties = schemaProperties(tool.inputSchema);
    const required = schemaRequired(tool.inputSchema);
    const captured = new Set(commandTool.args.captures.map((capture) => capture.name));
    const defaults = new Set(Object.keys(commandTool.args.defaults));

    for (const capture of commandTool.args.captures) {
      if (!properties[capture.name]) {
        errors.push(
          `Capture "${capture.name}" for tool "${tool.name}" does not exist in the input schema.`
        );
      }
    }

    for (const defaultArg of defaults) {
      if (!properties[defaultArg]) {
        errors.push(
          `Default arg "${defaultArg}" for tool "${tool.name}" does not exist in the input schema.`
        );
      }
    }

    for (const requiredArg of required) {
      if (!captured.has(requiredArg) && !defaults.has(requiredArg)) {
        errors.push(
          `Required arg "${requiredArg}" for tool "${tool.name}" is not satisfied by defaults or captures.`
        );
      }
    }

    for (const matcher of commandTool.matchers) {
      if (matcher.kind === "exact") {
        const existing = exactPhrases.get(matcher.phrase);
        if (existing) {
          errors.push(
            `Duplicate exact phrase "${matcher.phrase}" used by "${existing}" and "${tool.name}".`
          );
        } else {
          exactPhrases.set(matcher.phrase, tool.name);
        }
      }

      if (matcher.kind === "prefix") {
        const existing = prefixPhrases.get(matcher.prefix);
        if (existing) {
          errors.push(
            `Duplicate prefix "${matcher.prefix}" used by "${existing}" and "${tool.name}".`
          );
        } else {
          prefixPhrases.set(matcher.prefix, tool.name);
        }
      }

      if (matcher.kind === "regex") {
        if (!matcher.pattern.startsWith("^") || !matcher.pattern.endsWith("$")) {
          errors.push(
            `Regex matcher "${matcher.pattern}" for tool "${tool.name}" must be anchored with ^ and $.`
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings
    };
  }

  return {
    ok: true,
    warnings
  };
}
