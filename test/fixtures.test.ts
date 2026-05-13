import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { compileMcpCommands } from "../src/core/compile.js";
import { ambiguousTools } from "../src/fixtures/ambiguousTools.js";
import {
  databaseLikeFallbacks,
  databaseLikeMatches,
  databaseLikeTools
} from "../src/fixtures/databaseLike.js";
import {
  docsProjectsFallbacks,
  docsProjectsMatches,
  docsProjectsTools
} from "../src/fixtures/docsProjects.js";
import { dangerousActionsTools } from "../src/fixtures/dangerousActions.js";
import {
  githubLikeFallbacks,
  githubLikeMatches,
  githubLikeTools
} from "../src/fixtures/githubLike.js";

async function loadParseCommandFromTools(tools: Parameters<typeof compileMcpCommands>[0]) {
  const output = compileMcpCommands(tools);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mcp-command-compiler-fixture-"));
  const modulePath = path.join(tempDir, "generatedParser.mjs");
  const transpiled = ts.transpileModule(output.parserSource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });

  await writeFile(modulePath, transpiled.outputText, "utf8");
  const parserModule = await import(pathToFileURL(modulePath).href);
  return parserModule.parseCommand as (input: string) => {
    matched: boolean;
    toolName?: string;
  };
}

describe("fixtures", () => {
  it("matches and falls back for the docs/projects fixture", async () => {
    const parseCommand = await loadParseCommandFromTools(docsProjectsTools);

    for (const input of docsProjectsMatches) {
      expect(parseCommand(input)).toMatchObject({ matched: true });
    }

    for (const input of docsProjectsFallbacks) {
      expect(parseCommand(input)).toMatchObject({ matched: false });
    }
  });

  it("matches and falls back for the github-like fixture", async () => {
    const parseCommand = await loadParseCommandFromTools(githubLikeTools);

    for (const input of githubLikeMatches) {
      expect(parseCommand(input)).toMatchObject({ matched: true });
    }

    for (const input of githubLikeFallbacks) {
      expect(parseCommand(input)).toMatchObject({ matched: false });
    }
  });

  it("matches and falls back for the database-like fixture", async () => {
    const parseCommand = await loadParseCommandFromTools(databaseLikeTools);

    for (const input of databaseLikeMatches) {
      expect(parseCommand(input)).toMatchObject({ matched: true });
    }

    for (const input of databaseLikeFallbacks) {
      expect(parseCommand(input)).toMatchObject({ matched: false });
    }
  });

  it("skips dangerous actions by default", () => {
    const output = compileMcpCommands(dangerousActionsTools);
    expect(output.ir.tools).toHaveLength(0);
  });

  it("handles ambiguous list commands conservatively", async () => {
    const parseCommand = await loadParseCommandFromTools(ambiguousTools);

    expect(parseCommand("list files")).toMatchObject({
      matched: true,
      toolName: "list_files"
    });
    expect(parseCommand("list folders")).toMatchObject({
      matched: true,
      toolName: "list_folders"
    });
    expect(parseCommand("list file versions")).toMatchObject({
      matched: true,
      toolName: "list_file_versions"
    });
    expect(parseCommand("list file stuff")).toMatchObject({
      matched: false
    });
    expect(parseCommand("list files and folders")).toMatchObject({
      matched: false
    });
  });
});
