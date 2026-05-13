import { emitTypescriptParser } from "../codegen/typescript/emitTypescriptParser.js";
import { emitTypescriptTests } from "../codegen/typescript/emitTypescriptTests.js";
import type { CompileOptions } from "../types/compileOptions.js";
import type { CommandIr } from "../types/commandIr.js";
import type { McpToolDefinition } from "../types/mcpTool.js";
import type { ValidationResult } from "../types/validation.js";
import { generateCommandIr } from "./generateCommandIr.js";
import { generateHelpMarkdown } from "./generateHelpMarkdown.js";
import { validateCommandIr } from "./validateCommandIr.js";

export function compileMcpCommands(
  tools: McpToolDefinition[],
  options?: CompileOptions
): {
  ir: CommandIr;
  parserSource: string;
  testSource: string;
  helpMarkdown: string;
  validation: ValidationResult;
} {
  const ir = generateCommandIr(tools, options);
  const parserSource = emitTypescriptParser(ir);
  const testSource = emitTypescriptTests(ir);
  const helpMarkdown = generateHelpMarkdown(ir);
  const validation = validateCommandIr(ir, tools, options);

  return {
    ir,
    parserSource,
    testSource,
    helpMarkdown,
    validation
  };
}
