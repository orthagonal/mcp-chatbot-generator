import type { CommandIr, MatcherIr } from "../../types/commandIr.js";

type ExactEntry = {
  phrase: string;
  result: {
    matched: true;
    toolName: string;
    args: Record<string, unknown>;
    source: "exact" | "builtin";
    requiresConfirmation: boolean;
  };
};

type PrefixEntry = {
  prefix: string;
  toolName: string;
  captureRestAs: string;
  defaults: Record<string, unknown>;
  requiresConfirmation: boolean;
};

type RegexEntry = {
  pattern: string;
  toolName: string;
  captures: string[];
  defaults: Record<string, unknown>;
  requiresConfirmation: boolean;
};

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function emitTypescriptParser(ir: CommandIr): string {
  const exactCommands: ExactEntry[] = [];
  const prefixCommands: PrefixEntry[] = [];
  const regexCommands: RegexEntry[] = [];

  for (const builtin of ir.builtins) {
    for (const alias of builtin.aliases) {
      exactCommands.push({
        phrase: alias,
        result: {
          matched: true,
          toolName: "__help__",
          args: {},
          source: "builtin",
          requiresConfirmation: false
        }
      });
    }
  }

  for (const tool of ir.tools) {
    for (const matcher of tool.matchers) {
      if (matcher.kind === "exact") {
        exactCommands.push({
          phrase: matcher.phrase,
          result: {
            matched: true,
            toolName: tool.toolName,
            args: tool.args.defaults,
            source: "exact",
            requiresConfirmation: tool.safety.requiresConfirmation
          }
        });
      }

      if (matcher.kind === "prefix") {
        prefixCommands.push({
          prefix: matcher.prefix,
          toolName: tool.toolName,
          captureRestAs: matcher.captureRestAs,
          defaults: tool.args.defaults,
          requiresConfirmation: tool.safety.requiresConfirmation
        });
      }

      if (matcher.kind === "regex") {
        regexCommands.push({
          pattern: matcher.pattern,
          toolName: tool.toolName,
          captures: matcher.captures,
          defaults: tool.args.defaults,
          requiresConfirmation: tool.safety.requiresConfirmation
        });
      }
    }
  }

  const exactRecord = Object.fromEntries(
    exactCommands.map((command) => [command.phrase, command.result])
  );

  return `export type ParseResult =
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
    .replace(/\\s+/g, " ");
}

function hasCompoundInstruction(value: string): boolean {
  return /^(and|then)\\b/.test(value) || /\\b(and|then)\\s+(list|show|get|open|read|describe|count|create|update|delete|remove|send|publish|deploy|purchase|email|invite|transfer|execute|run|make|summarize|compare|report)\\b/.test(value);
}

const exactCommands: Record<string, ParseResult> = ${serialize(exactRecord)};

const prefixCommands = ${serialize(prefixCommands)} as const;

const regexCommands = ${serialize(regexCommands)} as const;

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
`;
}
