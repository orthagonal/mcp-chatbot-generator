import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { compileMcpCommands } from "../src/core/compile.js";
import { generateHelpMarkdown } from "../src/core/generateHelpMarkdown.js";
import { docsProjectsTools } from "../src/fixtures/docsProjects.js";

async function loadGeneratedParser(source: string) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "mcp-command-compiler-"));
  const modulePath = path.join(tempDir, "generatedParser.mjs");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });

  await writeFile(modulePath, transpiled.outputText, "utf8");
  return import(pathToFileURL(modulePath).href);
}

describe("emitted parser", () => {
  it("contains the expected parser structures", () => {
    const output = compileMcpCommands(docsProjectsTools, {
      namespace: "docs_projects"
    });

    expect(output.parserSource).toContain("export function parseCommand");
    expect(output.parserSource).toContain("const exactCommands");
    expect(output.parserSource).toContain("const prefixCommands");
  });

  it("matches golden cases and falls back conservatively", async () => {
    const output = compileMcpCommands(docsProjectsTools, {
      namespace: "docs_projects"
    });
    const parserModule = await loadGeneratedParser(output.parserSource);
    const parseCommand = parserModule.parseCommand as (input: string) => unknown;

    expect(parseCommand("help")).toMatchObject({
      matched: true,
      toolName: "__help__"
    });
    expect(parseCommand("list docs")).toMatchObject({
      matched: true,
      toolName: "list_documents",
      args: { limit: 20 }
    });
    expect(parseCommand("search docs webgpu shader")).toMatchObject({
      matched: true,
      toolName: "search_documents",
      args: { query: "webgpu shader", limit: 10 }
    });
    expect(parseCommand("get doc abc123")).toMatchObject({
      matched: true,
      toolName: "get_document",
      args: { id: "abc123" }
    });
    expect(parseCommand("delete doc abc123")).toMatchObject({
      matched: false
    });
    expect(parseCommand("summarize all docs about shaders")).toMatchObject({
      matched: false
    });
    expect(parseCommand("search docs and make a report")).toMatchObject({
      matched: false
    });
  });

  it("generates help markdown from the same IR", () => {
    const output = compileMcpCommands(docsProjectsTools, {
      namespace: "docs_projects"
    });
    const markdown = generateHelpMarkdown(output.ir);

    expect(markdown).toContain("# MCP Command Help");
    expect(markdown).toContain("help");
    expect(markdown).toContain("?");
    expect(markdown).toContain("list docs");
    expect(markdown).toContain("search docs <query>");
    expect(markdown).toContain("get doc <id>");
    expect(markdown).toContain("Fallback behavior");
  });
});
