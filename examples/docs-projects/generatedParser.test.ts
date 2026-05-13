import { describe, expect, it } from "vitest";
import { parseCommand } from "./generatedParser";

describe("generated parser", () => {
  it("matches built-in help", () => {
    expect(parseCommand("help")).toMatchObject({
      matched: true,
      toolName: "__help__"
    });
  });

  it("matches an exact command", () => {
    expect(parseCommand("list docs")).toMatchObject({
      matched: true
    });
  });

  it("matches a prefix command", () => {
    expect(parseCommand("search docs shader")).toMatchObject({
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
