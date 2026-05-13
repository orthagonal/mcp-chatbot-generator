import type {
  CaptureIr,
  CommandIr,
  CommandIntent,
  CommandToolIr,
  MatcherIr
} from "../types/commandIr.js";
import type { CompileOptions } from "../types/compileOptions.js";
import type { McpToolDefinition } from "../types/mcpTool.js";
import { resolveCompileOptions } from "./options.js";
import {
  choosePrimaryCaptureArg,
  detectIntent,
  extractDefaults,
  getCaptureType,
  intentVerbs,
  isToolDestructive,
  isToolReadOnly,
  normalizeToolNouns,
  pickSummary,
  schemaProperties,
  schemaRequired
} from "./shared.js";

function buildMatchersForTool(input: {
  intent: CommandIntent;
  nouns: string[];
  verbs: string[];
  captureArg: string | null;
  defaults: Record<string, unknown>;
  properties: ReturnType<typeof schemaProperties>;
  requiresConfirmation: boolean;
  includeRegexMatchers: boolean;
  maxAliasesPerTool: number;
}): {
  aliases: string[];
  examples: string[];
  usage: string[];
  matchers: MatcherIr[];
  captures: CaptureIr[];
} {
  const {
    intent,
    nouns,
    verbs,
    captureArg,
    properties,
    includeRegexMatchers,
    maxAliasesPerTool
  } = input;
  const aliases: string[] = [];
  const examples: string[] = [];
  const usage: string[] = [];
  const matchers: MatcherIr[] = [];
  const captures: CaptureIr[] = [];

  if (captureArg) {
    captures.push({
      name: captureArg,
      type: getCaptureType(properties[captureArg]),
      required: true
    });
  }

  const addAlias = (alias: string): void => {
    if (aliases.length >= maxAliasesPerTool || aliases.includes(alias)) return;
    aliases.push(alias);
  };

  const addUsage = (value: string): void => {
    if (!usage.includes(value)) usage.push(value);
  };

  const addExample = (value: string): void => {
    if (!examples.includes(value)) examples.push(value);
  };

  if (intent === "list") {
    for (const noun of nouns) {
      for (const verb of verbs) {
        const phrases =
          verb === "list"
            ? [`list ${noun}`, `list all ${noun}`]
            : [`show ${noun}`];

        for (const phrase of phrases) {
          addAlias(phrase);
          addUsage(phrase);
          matchers.push({ kind: "exact", phrase });
        }
      }
    }

    for (const example of aliases.slice(0, 2)) addExample(example);
  } else if (intent === "count") {
    for (const noun of nouns) {
      const phrase = `count ${noun}`;
      addAlias(phrase);
      addUsage(phrase);
      matchers.push({ kind: "exact", phrase });
    }

    for (const example of aliases.slice(0, 2)) addExample(example);
  } else if (captureArg) {
    const placeholder =
      intent === "search"
        ? "<query>"
        : intent === "describe"
          ? "<id-or-name>"
          : captureArg === "name"
            ? "<name>"
            : "<id>";

    for (const noun of nouns) {
      for (const verb of verbs) {
        const prefix = `${verb} ${noun} `;
        addAlias(`${verb} ${noun} ${placeholder}`);
        addUsage(`${verb} ${noun} ${placeholder}`);
        matchers.push({
          kind: "prefix",
          prefix,
          captureRestAs: captureArg
        });
      }
    }

    const exampleValue =
      intent === "search"
        ? "shader"
        : intent === "describe"
          ? "users"
          : "abc123";

    for (const noun of nouns.slice(0, 2)) {
      addExample(`${verbs[0]} ${noun} ${exampleValue}`);
    }
  }

  if (includeRegexMatchers && captureArg && nouns.length > 0) {
    const escapedNouns = nouns
      .map((noun) => noun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const escapedVerbs = verbs
      .map((verb) => verb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    if (escapedNouns && escapedVerbs) {
      matchers.push({
        kind: "regex",
        pattern: `^(${escapedVerbs}) (${escapedNouns}) (.+)$`,
        captures: [captureArg]
      });
    }
  }

  return {
    aliases,
    examples,
    usage,
    matchers,
    captures
  };
}

export function generateCommandIr(
  tools: McpToolDefinition[],
  options?: CompileOptions
): CommandIr {
  const resolved = resolveCompileOptions(options);
  const commandTools: CommandToolIr[] = [];

  for (const tool of tools) {
    const detected = detectIntent(tool.name);
    if (!detected) continue;

    const { intent, suffix } = detected;
    const readOnly = isToolReadOnly(tool, intent);
    const destructive = isToolDestructive(tool, intent);

    if (!readOnly && !resolved.allowWriteCommands) continue;
    if (destructive && !resolved.allowDestructiveCommands) continue;

    const properties = schemaProperties(tool.inputSchema);
    const defaults = extractDefaults(tool.inputSchema);
    const required = schemaRequired(tool.inputSchema);
    const captureArg = choosePrimaryCaptureArg(intent, required, properties);

    const covered = new Set<string>([
      ...Object.keys(defaults),
      ...(captureArg ? [captureArg] : [])
    ]);
    const missingRequired = required.filter((name) => !covered.has(name));

    if (missingRequired.length > 0) continue;

    if (
      (intent === "search" || intent === "get" || intent === "describe") &&
      !captureArg
    ) {
      continue;
    }

    const nouns = normalizeToolNouns(suffix, intent);
    const verbs = intentVerbs[intent];
    const requiresConfirmation = !readOnly && resolved.requireConfirmationForWrites;

    const { aliases, examples, usage, matchers, captures } = buildMatchersForTool({
      intent,
      nouns,
      verbs,
      captureArg,
      defaults,
      properties,
      requiresConfirmation,
      includeRegexMatchers: resolved.includeRegexMatchers,
      maxAliasesPerTool: resolved.maxAliasesPerTool
    });

    if (matchers.length === 0) continue;

    commandTools.push({
      toolName: tool.name,
      safety: {
        readOnly,
        destructive,
        requiresConfirmation
      },
      command: {
        intent,
        nouns,
        verbs,
        aliases,
        examples
      },
      matchers,
      args: {
        defaults,
        captures
      },
      help: {
        summary: pickSummary(tool),
        usage
      }
    });
  }

  return {
    version: 1,
    namespace: resolved.namespace,
    builtins: [
      {
        name: "help",
        aliases: ["help", "?"]
      }
    ],
    tools: commandTools
  };
}
