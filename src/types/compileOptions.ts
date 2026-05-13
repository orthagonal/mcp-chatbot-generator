export type CompileOptions = {
  namespace?: string;
  allowWriteCommands?: boolean;
  allowDestructiveCommands?: boolean;
  requireConfirmationForWrites?: boolean;
  includeRegexMatchers?: boolean;
  maxAliasesPerTool?: number;
};

export const defaultCompileOptions: Required<CompileOptions> = {
  namespace: "default",
  allowWriteCommands: false,
  allowDestructiveCommands: false,
  requireConfirmationForWrites: true,
  includeRegexMatchers: false,
  maxAliasesPerTool: 12
};
