import type { CommandIr } from "../../types/commandIr.js";

export function emitTypescriptTests(ir: CommandIr): string {
  const listLike = ir.tools.find((tool) =>
    tool.matchers.some((matcher) => matcher.kind === "exact")
  );
  const prefixLike = ir.tools.find((tool) =>
    tool.matchers.some((matcher) => matcher.kind === "prefix")
  );
  const listExample =
    listLike?.command.examples[0] ??
    listLike?.help.usage[0] ??
    "help";
  const prefixExample =
    prefixLike?.command.examples[0] ??
    prefixLike?.help.usage[0]?.replace(/<[^>]+>/g, "example") ??
    "help";

  return `import { describe, expect, it } from "vitest";
import { parseCommand } from "./generatedParser";

describe("generated parser", () => {
  it("matches built-in help", () => {
    expect(parseCommand("help")).toMatchObject({
      matched: true,
      toolName: "__help__"
    });
  });

  it("matches an exact command", () => {
    expect(parseCommand(${JSON.stringify(listExample)})).toMatchObject({
      matched: true
    });
  });

  it("matches a prefix command", () => {
    expect(parseCommand(${JSON.stringify(prefixExample)})).toMatchObject({
      matched: true
    });
  });

  it("falls back for unmatched input", () => {
    expect(parseCommand("summarize everything")).toMatchObject({
      matched: false,
      fallback: "llm"
    });
  });
});
`;
}
