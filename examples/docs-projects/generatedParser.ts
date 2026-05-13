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

function normalizeCommand(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ");
}

function hasCompoundInstruction(value: string): boolean {
  return /^(and|then)\b/.test(value) || /\b(and|then)\s+(list|show|get|open|read|describe|count|create|update|delete|remove|send|publish|deploy|purchase|email|invite|transfer|execute|run|make|summarize|compare|report)\b/.test(value);
}

const exactCommands: Record<string, ParseResult> = {
  "help": {
    "matched": true,
    "toolName": "__help__",
    "args": {},
    "source": "builtin",
    "requiresConfirmation": false
  },
  "?": {
    "matched": true,
    "toolName": "__help__",
    "args": {},
    "source": "builtin",
    "requiresConfirmation": false
  },
  "list docs": {
    "matched": true,
    "toolName": "list_documents",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  },
  "list all docs": {
    "matched": true,
    "toolName": "list_documents",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  },
  "show docs": {
    "matched": true,
    "toolName": "list_documents",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  },
  "list documents": {
    "matched": true,
    "toolName": "list_documents",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  },
  "list all documents": {
    "matched": true,
    "toolName": "list_documents",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  },
  "show documents": {
    "matched": true,
    "toolName": "list_documents",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  },
  "list projects": {
    "matched": true,
    "toolName": "list_projects",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  },
  "list all projects": {
    "matched": true,
    "toolName": "list_projects",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  },
  "show projects": {
    "matched": true,
    "toolName": "list_projects",
    "args": {
      "limit": 20
    },
    "source": "exact",
    "requiresConfirmation": false
  }
};

const prefixCommands = [
  {
    "prefix": "search docs ",
    "toolName": "search_documents",
    "captureRestAs": "query",
    "defaults": {
      "limit": 10
    },
    "requiresConfirmation": false
  },
  {
    "prefix": "find docs ",
    "toolName": "search_documents",
    "captureRestAs": "query",
    "defaults": {
      "limit": 10
    },
    "requiresConfirmation": false
  },
  {
    "prefix": "search documents ",
    "toolName": "search_documents",
    "captureRestAs": "query",
    "defaults": {
      "limit": 10
    },
    "requiresConfirmation": false
  },
  {
    "prefix": "find documents ",
    "toolName": "search_documents",
    "captureRestAs": "query",
    "defaults": {
      "limit": 10
    },
    "requiresConfirmation": false
  },
  {
    "prefix": "get doc ",
    "toolName": "get_document",
    "captureRestAs": "id",
    "defaults": {},
    "requiresConfirmation": false
  },
  {
    "prefix": "open doc ",
    "toolName": "get_document",
    "captureRestAs": "id",
    "defaults": {},
    "requiresConfirmation": false
  },
  {
    "prefix": "read doc ",
    "toolName": "get_document",
    "captureRestAs": "id",
    "defaults": {},
    "requiresConfirmation": false
  },
  {
    "prefix": "get document ",
    "toolName": "get_document",
    "captureRestAs": "id",
    "defaults": {},
    "requiresConfirmation": false
  },
  {
    "prefix": "open document ",
    "toolName": "get_document",
    "captureRestAs": "id",
    "defaults": {},
    "requiresConfirmation": false
  },
  {
    "prefix": "read document ",
    "toolName": "get_document",
    "captureRestAs": "id",
    "defaults": {},
    "requiresConfirmation": false
  }
] as const;

const regexCommands = [] as const;

export function parseCommand(input: string): ParseResult {
  const normalized = normalizeCommand(input);

  const exact = exactCommands[normalized];
  if (exact) return exact;

  for (const command of prefixCommands) {
    if (normalized.startsWith(command.prefix)) {
      const value = normalized.slice(command.prefix.length).trim();

      if (!value) {
        return {
          matched: false,
          reason: "Prefix matched but required argument was empty.",
          fallback: "llm"
        };
      }

      if (hasCompoundInstruction(value)) {
        return {
          matched: false,
          reason: "Prefix matched but capture looked like a chained instruction.",
          fallback: "llm"
        };
      }

      return {
        matched: true,
        toolName: command.toolName,
        args: {
          ...command.defaults,
          [command.captureRestAs]: value
        },
        source: "prefix",
        requiresConfirmation: command.requiresConfirmation
      };
    }
  }

  for (const command of regexCommands) {
    const match = new RegExp(command.pattern).exec(normalized);
    if (!match) continue;

    const capturedValues = match.slice(1).slice(-command.captures.length);
    const args: Record<string, unknown> = { ...command.defaults };

    for (let index = 0; index < command.captures.length; index += 1) {
      const value = (capturedValues[index] ?? "").trim();
      if (!value) {
        return {
          matched: false,
          reason: "Regex matched but required argument was empty.",
          fallback: "llm"
        };
      }

      if (hasCompoundInstruction(value)) {
        return {
          matched: false,
          reason: "Regex matched but capture looked like a chained instruction.",
          fallback: "llm"
        };
      }

      args[command.captures[index]] = value;
    }

    return {
      matched: true,
      toolName: command.toolName,
      args,
      source: "regex",
      requiresConfirmation: command.requiresConfirmation
    };
  }

  return {
    matched: false,
    reason: "No deterministic command matched.",
    fallback: "llm"
  };
}
