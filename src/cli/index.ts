import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import {
  compileMcpCommands,
  generateCommandIr,
  generateHelpMarkdown,
  runSelfImprove
} from "../index.js";
import { mcpToolDefinitionSchema } from "../types/mcpTool.js";
import type { CompileOptions } from "../types/compileOptions.js";

async function loadTools(toolsPath: string) {
  const raw = await readFile(toolsPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return mcpToolDefinitionSchema.array().parse(parsed);
}

function collectCompileOptions(options: Record<string, unknown>): CompileOptions {
  return {
    namespace: typeof options.namespace === "string" ? options.namespace : undefined,
    allowWriteCommands: Boolean(options.allowWriteCommands),
    allowDestructiveCommands: Boolean(options.allowDestructiveCommands),
    requireConfirmationForWrites:
      options.requireConfirmationForWrites === undefined
        ? undefined
        : Boolean(options.requireConfirmationForWrites),
    includeRegexMatchers: Boolean(options.includeRegexMatchers),
    maxAliasesPerTool:
      typeof options.maxAliasesPerTool === "number"
        ? options.maxAliasesPerTool
        : typeof options.maxAliasesPerTool === "string"
          ? Number(options.maxAliasesPerTool)
          : undefined
  };
}

function withCompileFlags(command: Command): Command {
  return command
    .option("--namespace <namespace>", "IR namespace")
    .option("--allow-write-commands", "Include non-read-only tools", false)
    .option(
      "--allow-destructive-commands",
      "Include destructive tools",
      false
    )
    .option(
      "--require-confirmation-for-writes",
      "Require confirmation for non-read-only tools",
      undefined
    )
    .option("--include-regex-matchers", "Emit simple regex matchers", false)
    .option(
      "--max-aliases-per-tool <count>",
      "Maximum aliases per tool",
      (value) => Number(value)
    );
}

const program = new Command();

program
  .name("mcp-command-compiler")
  .description("Compile deterministic command parsers from MCP-style tool definitions.")
  .addHelpCommand(false);

withCompileFlags(
  program
    .command("ir")
    .requiredOption("--tools <path>", "Path to a JSON file containing MCP-style tools")
    .requiredOption("--out <path>", "Path to write command-ir.json")
).action(async (commandOptions) => {
  const tools = await loadTools(commandOptions.tools);
  const options = collectCompileOptions(commandOptions);
  const ir = generateCommandIr(tools, options);
  await writeFile(commandOptions.out, `${JSON.stringify(ir, null, 2)}\n`, "utf8");
});

withCompileFlags(
  program
    .command("help")
    .requiredOption("--tools <path>", "Path to a JSON file containing MCP-style tools")
    .requiredOption("--out <path>", "Path to write MCP_COMMANDS.md")
).action(async (commandOptions) => {
  const tools = await loadTools(commandOptions.tools);
  const options = collectCompileOptions(commandOptions);
  const ir = generateCommandIr(tools, options);
  const markdown = generateHelpMarkdown(ir);
  await writeFile(commandOptions.out, markdown, "utf8");
});

withCompileFlags(
  program
    .command("compile")
    .requiredOption("--tools <path>", "Path to a JSON file containing MCP-style tools")
    .requiredOption("--target <target>", "Code generation target")
    .requiredOption("--out <dir>", "Directory to write generated files")
).action(async (commandOptions) => {
  if (commandOptions.target !== "typescript") {
    throw new Error(`Unsupported target: ${commandOptions.target}`);
  }

  const tools = await loadTools(commandOptions.tools);
  const options = collectCompileOptions(commandOptions);
  const output = compileMcpCommands(tools, options);
  const outDir = path.resolve(commandOptions.out);

  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "generatedParser.ts"),
    output.parserSource,
    "utf8"
  );
  await writeFile(
    path.join(outDir, "generatedParser.test.ts"),
    output.testSource,
    "utf8"
  );
  await writeFile(path.join(outDir, "MCP_COMMANDS.md"), output.helpMarkdown, "utf8");
  await writeFile(
    path.join(outDir, "command-ir.json"),
    `${JSON.stringify(output.ir, null, 2)}\n`,
    "utf8"
  );
});

program
  .command("self-improve")
  .requiredOption(
    "--schema <path-or-url>",
    "Local path or URL containing Zod schema source"
  )
  .option("--out <path>", "Path to write the generated test file")
  .option("--model <model>", "LLM model name")
  .option("--api-key <key>", "API key (defaults to OPENAI_API_KEY)")
  .option(
    "--api-base-url <url>",
    "Base URL for an OpenAI-compatible chat completions API"
  )
  .option("--tool-name <name>", "Optional tool name hint")
  .option("--tool-description <text>", "Optional tool description hint")
  .option(
    "--max-iterations <count>",
    "Maximum test/fix attempts (capped at 3)",
    (value) => Number(value)
  )
  .action(async (commandOptions) => {
    const result = await runSelfImprove(
      {
        schemaLocation: commandOptions.schema,
        testPath: commandOptions.out,
        model: commandOptions.model,
        apiKey: commandOptions.apiKey,
        apiBaseUrl: commandOptions.apiBaseUrl,
        maxIterations: commandOptions.maxIterations,
        toolName: commandOptions.toolName,
        toolDescription: commandOptions.toolDescription
      },
      {
        log: (message) => {
          process.stdout.write(`${message}\n`);
        }
      }
    );

    if (!result.ok) {
      if (result.lastOutput) {
        process.stderr.write(`${result.lastOutput}\n`);
      }
      process.exitCode = 1;
      return;
    }

    process.stdout.write(`Generated test: ${path.relative(process.cwd(), result.testPath)}\n`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
