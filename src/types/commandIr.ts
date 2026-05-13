export type CommandIntent =
  | "list"
  | "get"
  | "search"
  | "describe"
  | "count"
  | "create"
  | "update"
  | "delete"
  | "run"
  | "help";

export type MatcherIr =
  | {
      kind: "exact";
      phrase: string;
    }
  | {
      kind: "prefix";
      prefix: string;
      captureRestAs: string;
    }
  | {
      kind: "regex";
      pattern: string;
      captures: string[];
    };

export type CaptureIr = {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
};

export type CommandToolIr = {
  toolName: string;
  serverName?: string;
  safety: {
    readOnly: boolean;
    destructive: boolean;
    requiresConfirmation: boolean;
  };
  command: {
    intent: CommandIntent;
    nouns: string[];
    verbs: string[];
    aliases: string[];
    examples: string[];
  };
  matchers: MatcherIr[];
  args: {
    defaults: Record<string, unknown>;
    captures: CaptureIr[];
  };
  help: {
    summary: string;
    usage: string[];
  };
};

export type BuiltinCommandIr = {
  name: "help";
  aliases: string[];
};

export type CommandIr = {
  version: 1;
  namespace: string;
  builtins: BuiltinCommandIr[];
  tools: CommandToolIr[];
};
