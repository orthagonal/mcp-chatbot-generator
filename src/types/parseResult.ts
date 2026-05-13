export type ParseResult =
  | {
      matched: true;
      toolName: string;
      args: Record<string, unknown>;
      source: "exact" | "prefix" | "regex" | "builtin";
      requiresConfirmation: boolean;
    }
  | {
      matched: false;
      reason: string;
      fallback: "llm";
    };
