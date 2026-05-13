# mcp-command-compiler

## Save tokens and the planet with a purpose-built parser for your AI's most common commands!

Compile **conservative, deterministic** natural-language command shortcuts from [Model Context Protocol](https://modelcontextprotocol.io/)-style tool definitions. Given a JSON list of tools (names, descriptions, JSON Schema inputs, optional annotations), the compiler builds an intermediate **command IR**, human-readable help (`MCP_COMMANDS.md`), and TypeScript that parses user text into a structured result: matched tool name, filled arguments, and whether confirmation is required.

The design favors predictable behavior over broad coverage: matchers are mostly exact phrases and prefixes derived from tool naming and schema shape, with optional simple regex matchers behind a flag.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer

## Install and build

From a clone of this repository:

```bash
pnpm install
pnpm build
```

The CLI entry point is `dist/cli/index.js` (exposed as the `mcp-command-compiler` binary when the package is linked or installed).

During development you can run the CLI without a prior build:

```bash
pnpm dev -- <subcommand> [options]
```

## CLI

All compile-related subcommands accept the same **compile flags** (see below).

### `ir` — emit command IR only

Writes `command-ir.json` (versioned IR describing tools, matchers, captures, and defaults).

```bash
mcp-command-compiler ir --tools path/to/tools.json --out path/to/command-ir.json
```

### `help` — emit help markdown only

Writes `MCP_COMMANDS.md` documenting built-in commands (for example `help`) and generated aliases with examples.

```bash
mcp-command-compiler help --tools path/to/tools.json --out path/to/MCP_COMMANDS.md
```

### `compile` — full TypeScript output

Currently the only code generation target is `typescript`. Writes four artifacts into the output directory:

| File | Purpose |
|------|---------|
| `generatedParser.ts` | `parseMcpCommand(input: string): ParseResult` and related types |
| `generatedParser.test.ts` | Generated tests aligned with the IR |
| `MCP_COMMANDS.md` | Same content as the `help` command |
| `command-ir.json` | Same content as the `ir` command |

```bash
mcp-command-compiler compile --tools path/to/tools.json --target typescript --out path/to/output-dir
```

### `self-improve` — LLM-assisted tests from a Zod schema

Uses an OpenAI-compatible chat API (by default `OPENAI_API_KEY`) to generate and iteratively fix a Vitest file that exercises parsing expectations inferred from a Zod schema file or URL. Iterations are capped at 3.

```bash
mcp-command-compiler self-improve --schema path/or/url/to/schema.ts [--out path/to/test.test.ts] [--model gpt-4o-mini] [--api-base-url https://api.openai.com/v1]
```

Package script: `pnpm self-improve -- --schema ...`

## Compile flags

These options apply to `ir`, `help`, and `compile`:

| Flag | Default behavior | Meaning |
|------|------------------|---------|
| `--namespace <name>` | `default` | Namespace string stored in the IR |
| `--allow-write-commands` | off | Include tools that are not treated as read-only |
| `--allow-destructive-commands` | off | Include tools flagged destructive (or inferred as such) |
| `--require-confirmation-for-writes` | on when omitted (library defaults) | Mark non-read-only invocations as requiring confirmation |
| `--include-regex-matchers` | off | Emit additional regex-based matchers |
| `--max-aliases-per-tool <n>` | `12` | Cap aliases per tool during IR generation |

If write or destructive tools appear in the tool list while the corresponding allow flags are false, validation treats that as an error when compiling.

## Tools JSON format

`--tools` must point to a JSON **array** of tool objects. Each object is validated with [Zod](https://zod.dev/) and roughly matches MCP tool metadata:

- **`name`** (string, required): Snake-case tool id; used with heuristics to infer intent (list, get, search, etc.).
- **`title`**, **`description`** (optional strings): Used for summaries and help text.
- **`inputSchema`** (required): JSON Schema-like object (`type`, `properties`, `required`, `default`, `enum`, string/number bounds, etc.).
- **`outputSchema`** (optional): Same shape as `inputSchema`; not required for command parsing.
- **`annotations`** (optional): `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` booleans — influence safety classification and confirmation behavior.

See `examples/docs-projects/tools.json` for a sample input and the generated `command-ir.json`, `MCP_COMMANDS.md`, and `generatedParser.ts` in that folder.

## Library API

The package exports stable functions for embedding the pipeline in your own tooling:

- **`generateCommandIr`**, **`validateCommandIr`** — IR construction and checks against the original tools and options.
- **`compileMcpCommands`** — IR plus emitted TypeScript parser, tests, help markdown, and `ValidationResult`.
- **`emitTypescriptParser`**, **`emitTypescriptTests`**, **`generateHelpMarkdown`** — lower-level building blocks.
- **`runSelfImprove`**, **`emitSelfImproveTestSource`** — programmatic access to the self-improve workflow and test emission.

Types include `McpToolDefinition`, `CommandIr`, `CompileOptions`, `ParseResult`, and self-improve option/result types (see `src/index.ts`).

Example (after validating or trusting the shape of your tools file):

```ts
import { readFile, writeFile } from "node:fs/promises";
import { compileMcpCommands } from "mcp-command-compiler";
import type { McpToolDefinition } from "mcp-command-compiler";

const raw: unknown = JSON.parse(await readFile("tools.json", "utf8"));
const tools = raw as McpToolDefinition[];

const { parserSource, validation } = compileMcpCommands(tools, {
  allowWriteCommands: false
});

if (!validation.ok) {
  throw new Error(validation.errors.join("\n"));
}

await writeFile("generatedParser.ts", parserSource, "utf8");
```

The CLI loads tools with the same Zod schemas as in `src/types/mcpTool.ts`; library callers can reuse that module from source or validate inputs however they prefer.

## Tests

```bash
pnpm test
```

## License

MIT
