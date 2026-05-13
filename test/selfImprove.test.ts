import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { emitSelfImproveTestSource } from "../src/selfImprove/emitTestSource.js";
import type { SelfImproveLlmClient } from "../src/selfImprove/types.js";
import { runSelfImprove } from "../src/selfImprove/workflow.js";

describe("self-improve helpers", () => {
  it("emits a deterministic vitest file from a structured spec", () => {
    const source = emitSelfImproveTestSource({
      title: "database-like schema",
      rationale: "Exercise safe database-style commands.",
      tools: [
        {
          name: "describe_table",
          description: "Describe a table by name.",
          inputSchema: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string" }
            }
          },
          annotations: {
            readOnlyHint: true
          }
        }
      ],
      matches: [
        {
          input: "describe table users",
          toolName: "describe_table",
          args: {
            name: "users"
          },
          source: "prefix"
        }
      ],
      fallbacks: [
        {
          input: "describe table users and delete it"
        }
      ]
    });

    expect(source).toContain('describe("database-like schema"');
    expect(source).toContain('"describe table users"');
    expect(source).toContain('"describe_table"');
    expect(source).toContain('fallback: "llm"');
  });
});

describe("runSelfImprove", () => {
  it("applies fixes and stops after the generated test passes", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "mcp-command-compiler-self-improve-"));
    await mkdir(path.join(tempDir, "src", "core"), { recursive: true });
    await mkdir(path.join(tempDir, "test"), { recursive: true });
    await writeFile(
      path.join(tempDir, "src", "core", "compile.ts"),
      "export const broken = true;\n",
      "utf8"
    );
    await writeFile(
      path.join(tempDir, "schema.ts"),
      "const describeTable = z.object({ name: z.string() });\n",
      "utf8"
    );

    const llmClient: SelfImproveLlmClient = {
      generateTestSpec: vi.fn(async () => ({
        title: "generated database-like test",
        tools: [
          {
            name: "describe_table",
            description: "Describe a table by name.",
            inputSchema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" }
              }
            },
            annotations: {
              readOnlyHint: true
            }
          }
        ],
        matches: [
          {
            input: "describe table users",
            toolName: "describe_table"
          }
        ],
        fallbacks: [
          {
            input: "describe table users and email me"
          }
        ]
      })),
      proposeFix: vi.fn(async () => ({
        status: "fix" as const,
        summary: "Adjust the compiler implementation.",
        fileUpdates: [
          {
            path: "src/core/compile.ts",
            content: "export const fixed = true;\n"
          }
        ]
      }))
    };
    const testRunner = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        exitCode: 1,
        output: "AssertionError: expected false to be true"
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        output: "1 test passed"
      });

    const result = await runSelfImprove(
      {
        cwd: tempDir,
        schemaLocation: "schema.ts",
        maxIterations: 3
      },
      {
        llmClient,
        testRunner
      }
    );

    expect(result.ok).toBe(true);
    expect(result.iterations).toBe(2);
    expect(testRunner).toHaveBeenCalledTimes(2);
    expect(llmClient.proposeFix).toHaveBeenCalledTimes(1);
    expect(
      await readFile(path.join(tempDir, "src", "core", "compile.ts"), "utf8")
    ).toBe("export const fixed = true;\n");
    expect(
      await readFile(path.join(tempDir, "test", "self-improve-schema.test.ts"), "utf8")
    ).toContain('describe("generated database-like test"');
  });

  it("caps the loop at three iterations", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "mcp-command-compiler-self-improve-"));
    await mkdir(path.join(tempDir, "src", "core"), { recursive: true });
    await mkdir(path.join(tempDir, "test"), { recursive: true });
    await writeFile(
      path.join(tempDir, "src", "core", "compile.ts"),
      "export const broken = true;\n",
      "utf8"
    );
    await writeFile(
      path.join(tempDir, "schema.ts"),
      "const listTables = z.object({});\n",
      "utf8"
    );

    const llmClient: SelfImproveLlmClient = {
      generateTestSpec: vi.fn(async () => ({
        title: "generated list test",
        tools: [
          {
            name: "list_tables",
            description: "List tables.",
            inputSchema: {
              type: "object",
              properties: {}
            },
            annotations: {
              readOnlyHint: true
            }
          }
        ],
        matches: [
          {
            input: "list tables",
            toolName: "list_tables"
          }
        ],
        fallbacks: [
          {
            input: "list tables and email me"
          }
        ]
      })),
      proposeFix: vi.fn(async () => ({
        status: "fix" as const,
        summary: "Try another compiler adjustment.",
        fileUpdates: [
          {
            path: "src/core/compile.ts",
            content: "export const attempt = true;\n"
          }
        ]
      }))
    };
    const testRunner = vi.fn().mockResolvedValue({
      ok: false,
      exitCode: 1,
      output: "still failing"
    });

    const result = await runSelfImprove(
      {
        cwd: tempDir,
        schemaLocation: "schema.ts",
        maxIterations: 5
      },
      {
        llmClient,
        testRunner
      }
    );

    expect(result.ok).toBe(false);
    expect(result.iterations).toBe(3);
    expect(result.summary).toContain("did not solve");
    expect(testRunner).toHaveBeenCalledTimes(3);
    expect(llmClient.proposeFix).toHaveBeenCalledTimes(2);
  });
});
