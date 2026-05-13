import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { emitSelfImproveTestSource } from "./emitTestSource.js";
import { createSelfImproveLlmClient } from "./llmClient.js";
import type {
  LoadedSchemaSource,
  SelfImproveLlmClient,
  SelfImproveLogger,
  SelfImproveResult,
  SelfImproveRunOptions,
  SelfImproveTestRunResult,
  SelfImproveWorkspaceFile
} from "./types.js";

type RunSelfImproveDependencies = {
  llmClient?: SelfImproveLlmClient;
  readSchemaSource?: (
    schemaLocation: string,
    cwd: string
  ) => Promise<LoadedSchemaSource>;
  testRunner?: (
    cwd: string,
    testPath: string
  ) => Promise<SelfImproveTestRunResult>;
  workspaceFilesProvider?: (
    cwd: string,
    testPath: string
  ) => Promise<SelfImproveWorkspaceFile[]>;
  log?: SelfImproveLogger;
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toRelativePosix(rootDir: string, targetPath: string): string {
  return path.relative(rootDir, targetPath).split(path.sep).join("/");
}

function stripAnsi(value: string): string {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
    ""
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultTestPath(rootDir: string, schemaLocation: string): string {
  const baseName = isHttpUrl(schemaLocation)
    ? (() => {
        const parsed = new URL(schemaLocation);
        const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
        return lastSegment ?? parsed.hostname;
      })()
    : path.basename(schemaLocation);
  const stem = baseName.replace(/\.[^.]+$/, "");
  const slug = slugify(stem) || "schema";

  return path.join(rootDir, "test", `self-improve-${slug}.test.ts`);
}

function normalizeIterations(value?: number): number {
  if (!value || !Number.isFinite(value)) return 3;
  return Math.min(Math.max(Math.trunc(value), 1), 3);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function defaultReadSchemaSource(
  schemaLocation: string,
  cwd: string
): Promise<LoadedSchemaSource> {
  if (isHttpUrl(schemaLocation)) {
    const response = await fetch(schemaLocation, {
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      throw new Error(
        `Failed to load schema from ${schemaLocation}: ${response.status} ${response.statusText}`
      );
    }

    return {
      location: schemaLocation,
      resolvedLocation: schemaLocation,
      source: await response.text()
    };
  }

  const resolvedLocation = path.resolve(cwd, schemaLocation);
  return {
    location: schemaLocation,
    resolvedLocation,
    source: await readFile(resolvedLocation, "utf8")
  };
}

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  if (!(await fileExists(directory))) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTypeScriptFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
}

async function defaultWorkspaceFilesProvider(
  cwd: string
): Promise<SelfImproveWorkspaceFile[]> {
  const srcFiles = await collectTypeScriptFiles(path.join(cwd, "src"));
  const testFiles = await collectTypeScriptFiles(path.join(cwd, "test"));
  const allFiles = [...srcFiles, ...testFiles].sort((left, right) =>
    left.localeCompare(right)
  );

  return Promise.all(
    allFiles.map(async (filePath) => ({
      path: toRelativePosix(cwd, filePath),
      content: await readFile(filePath, "utf8")
    }))
  );
}

async function defaultTestRunner(
  cwd: string,
  testPath: string
): Promise<SelfImproveTestRunResult> {
  const vitestEntrypoint = path.join(cwd, "node_modules", "vitest", "vitest.mjs");
  if (!(await fileExists(vitestEntrypoint))) {
    throw new Error(`Vitest entrypoint not found at ${vitestEntrypoint}`);
  }

  const relativeTestPath = toRelativePosix(cwd, testPath);

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [vitestEntrypoint, "run", relativeTestPath],
      {
        cwd,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      const output = stripAnsi(`${stdout}${stderr}`.trim());
      resolve({
        ok: exitCode === 0,
        exitCode: exitCode ?? 1,
        output
      });
    });
  });
}

async function applyWorkspaceFileUpdates(input: {
  cwd: string;
  testPath: string;
  fileUpdates: Array<{
    path: string;
    content: string;
  }>;
}): Promise<string[]> {
  const allowedTestPath = path.resolve(input.testPath);
  const appliedPaths: string[] = [];

  for (const update of input.fileUpdates) {
    const resolvedPath = path.resolve(input.cwd, update.path);
    const relativePath = toRelativePosix(input.cwd, resolvedPath);
    const isAllowed =
      relativePath.startsWith("src/") || resolvedPath === allowedTestPath;

    if (!isAllowed) {
      throw new Error(
        `Refusing to write ${relativePath}. Self-improve may only edit src/ or the generated test file.`
      );
    }

    await mkdir(path.dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, update.content, "utf8");
    appliedPaths.push(relativePath);
  }

  return appliedPaths;
}

export async function runSelfImprove(
  options: SelfImproveRunOptions,
  dependencies: RunSelfImproveDependencies = {}
): Promise<SelfImproveResult> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const log = dependencies.log ?? (() => {});
  const maxIterations = normalizeIterations(options.maxIterations);
  const readSchemaSource = dependencies.readSchemaSource ?? defaultReadSchemaSource;
  const testRunner = dependencies.testRunner ?? defaultTestRunner;
  const workspaceFilesProvider =
    dependencies.workspaceFilesProvider ?? defaultWorkspaceFilesProvider;
  const llmClient =
    dependencies.llmClient ??
    createSelfImproveLlmClient({
      model:
        options.model ??
        process.env.MCP_COMMAND_COMPILER_LLM_MODEL ??
        "",
      apiKey: options.apiKey ?? process.env.OPENAI_API_KEY ?? "",
      apiBaseUrl: options.apiBaseUrl ?? process.env.OPENAI_BASE_URL
    });

  if (!dependencies.llmClient) {
    if (!(options.model ?? process.env.MCP_COMMAND_COMPILER_LLM_MODEL)) {
      throw new Error(
        "Missing model. Pass --model or set MCP_COMMAND_COMPILER_LLM_MODEL."
      );
    }

    if (!(options.apiKey ?? process.env.OPENAI_API_KEY)) {
      throw new Error(
        "Missing API key. Pass --api-key or set OPENAI_API_KEY."
      );
    }
  }

  const schema = await readSchemaSource(options.schemaLocation, cwd);
  log(`Loaded schema source from ${schema.resolvedLocation}.`);

  let currentSpec = await llmClient.generateTestSpec({
    schema,
    toolName: options.toolName,
    toolDescription: options.toolDescription
  });
  let currentTestSource = emitSelfImproveTestSource(currentSpec);
  const testPath = path.resolve(
    cwd,
    options.testPath ?? defaultTestPath(cwd, options.schemaLocation)
  );
  const relativeTestPath = toRelativePosix(cwd, testPath);

  await mkdir(path.dirname(testPath), { recursive: true });
  await writeFile(testPath, currentTestSource, "utf8");
  log(`Wrote generated test to ${relativeTestPath}.`);

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    log(`Iteration ${iteration}/${maxIterations}: running ${relativeTestPath}.`);
    const testRun = await testRunner(cwd, testPath);

    if (testRun.ok) {
      const summary = `Self-improvement succeeded in ${iteration} iteration${iteration === 1 ? "" : "s"}.`;
      log(summary);
      return {
        ok: true,
        iterations: iteration,
        testPath,
        summary,
        lastOutput: testRun.output
      };
    }

    log(`Iteration ${iteration}/${maxIterations} failed.`);

    if (iteration >= maxIterations) {
      const summary = `Self-improvement did not solve the generated test within ${maxIterations} iteration${maxIterations === 1 ? "" : "s"}.`;
      log(summary);
      return {
        ok: false,
        iterations: iteration,
        testPath,
        summary,
        lastOutput: testRun.output
      };
    }

    const workspaceFiles = await workspaceFilesProvider(cwd, testPath);
    const fixPlan = await llmClient.proposeFix({
      schema,
      currentSpec,
      currentTestSource,
      testPath: relativeTestPath,
      failureOutput: testRun.output,
      workspaceFiles,
      attempt: iteration + 1,
      maxIterations,
      toolName: options.toolName,
      toolDescription: options.toolDescription
    });

    log(fixPlan.summary);

    if (fixPlan.status === "give_up") {
      return {
        ok: false,
        iterations: iteration,
        testPath,
        summary: fixPlan.summary,
        lastOutput: testRun.output
      };
    }

    const appliedPaths = await applyWorkspaceFileUpdates({
      cwd,
      testPath,
      fileUpdates: fixPlan.fileUpdates
    });

    if (fixPlan.updatedSpec) {
      currentSpec = fixPlan.updatedSpec;
      currentTestSource = emitSelfImproveTestSource(currentSpec);
      await writeFile(testPath, currentTestSource, "utf8");
      log(`Updated generated test spec at ${relativeTestPath}.`);
    } else if (await fileExists(testPath)) {
      currentTestSource = await readFile(testPath, "utf8");
    }

    if (!fixPlan.updatedSpec && appliedPaths.length === 0) {
      const summary = "The model did not provide a usable fix.";
      log(summary);
      return {
        ok: false,
        iterations: iteration,
        testPath,
        summary,
        lastOutput: testRun.output
      };
    }

    if (appliedPaths.length > 0) {
      log(`Applied ${appliedPaths.length} file update(s): ${appliedPaths.join(", ")}.`);
    }
  }

  return {
    ok: false,
    iterations: maxIterations,
    testPath,
    summary: `Self-improvement did not solve the generated test within ${maxIterations} iteration${maxIterations === 1 ? "" : "s"}.`
  };
}
