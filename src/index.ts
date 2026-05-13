export type { McpToolDefinition, McpJsonSchema } from "./types/mcpTool.js";
export type { CommandIr, CommandToolIr, MatcherIr } from "./types/commandIr.js";
export type { ParseResult } from "./types/parseResult.js";
export type { CompileOptions } from "./types/compileOptions.js";
export type { ValidationResult } from "./types/validation.js";
export type { LlmIrGenerator } from "./types/llm.js";
export type {
  LoadedSchemaSource,
  SelfImproveLlmClient,
  SelfImproveLogger,
  SelfImproveResult,
  SelfImproveRunOptions,
  SelfImproveTestRunResult,
  SelfImproveWorkspaceFile
} from "./selfImprove/types.js";
export type {
  SelfImproveFixPlan,
  SelfImproveFileUpdate,
  SelfImproveTestSpec
} from "./selfImprove/testSpec.js";

export { generateCommandIr } from "./core/generateCommandIr.js";
export { validateCommandIr } from "./core/validateCommandIr.js";
export { generateHelpMarkdown } from "./core/generateHelpMarkdown.js";
export { emitTypescriptParser } from "./codegen/typescript/emitTypescriptParser.js";
export { emitTypescriptTests } from "./codegen/typescript/emitTypescriptTests.js";
export { compileMcpCommands } from "./core/compile.js";
export { emitSelfImproveTestSource } from "./selfImprove/emitTestSource.js";
export { runSelfImprove } from "./selfImprove/workflow.js";
