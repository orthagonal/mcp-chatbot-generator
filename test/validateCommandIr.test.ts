import { describe, expect, it } from "vitest";
import { generateCommandIr } from "../src/core/generateCommandIr.js";
import { validateCommandIr } from "../src/core/validateCommandIr.js";
import { docsProjectsTools } from "../src/fixtures/docsProjects.js";

describe("validateCommandIr", () => {
  it("accepts generated IR for the docs/projects fixture", () => {
    const ir = generateCommandIr(docsProjectsTools, {
      namespace: "docs_projects"
    });
    const validation = validateCommandIr(ir, docsProjectsTools);

    expect(validation.ok).toBe(true);
  });

  it("rejects duplicate exact phrases", () => {
    const ir = generateCommandIr(docsProjectsTools);
    const duplicate = structuredClone(ir);
    const listProjects = duplicate.tools.find(
      (tool) => tool.toolName === "list_projects"
    );

    if (!listProjects) {
      throw new Error("Expected list_projects in generated IR.");
    }

    listProjects.matchers = [
      {
        kind: "exact",
        phrase: "list docs"
      }
    ];

    const validation = validateCommandIr(duplicate, docsProjectsTools);

    expect(validation.ok).toBe(false);
    if (validation.ok) return;
    expect(validation.errors.some((error) => error.includes("Duplicate exact phrase"))).toBe(
      true
    );
  });
});
