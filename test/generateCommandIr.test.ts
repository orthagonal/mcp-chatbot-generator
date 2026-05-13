import { describe, expect, it } from "vitest";
import { generateCommandIr } from "../src/core/generateCommandIr.js";
import { dangerousActionsTools } from "../src/fixtures/dangerousActions.js";
import { docsProjectsTools } from "../src/fixtures/docsProjects.js";

describe("generateCommandIr", () => {
  it("includes safe read-only tools and skips destructive tools by default", () => {
    const ir = generateCommandIr(docsProjectsTools, {
      namespace: "docs_projects"
    });

    expect(ir.namespace).toBe("docs_projects");
    expect(ir.tools.map((tool) => tool.toolName)).toContain("list_documents");
    expect(ir.tools.map((tool) => tool.toolName)).toContain("search_documents");
    expect(ir.tools.map((tool) => tool.toolName)).toContain("get_document");
    expect(ir.tools.map((tool) => tool.toolName)).toContain("list_projects");
    expect(ir.tools.map((tool) => tool.toolName)).not.toContain("delete_document");
  });

  it("skips dangerous tools that do not map to safe read-only commands", () => {
    const ir = generateCommandIr(dangerousActionsTools);
    expect(ir.tools).toHaveLength(0);
  });
});
