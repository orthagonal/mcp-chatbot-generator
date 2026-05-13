import type { CompileOptions } from "./compileOptions.js";
import type { CommandIr } from "./commandIr.js";
import type { McpToolDefinition } from "./mcpTool.js";

export type LlmIrGenerator = {
  generateCommandIrFromTools(input: {
    tools: McpToolDefinition[];
    options: CompileOptions;
  }): Promise<CommandIr>;
};
