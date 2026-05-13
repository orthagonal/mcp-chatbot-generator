import type { SelfImproveFixPlan, SelfImproveTestSpec } from "./testSpec.js";

export type LoadedSchemaSource = {
  location: string;
  resolvedLocation: string;
  source: string;
};

export type SelfImproveWorkspaceFile = {
  path: string;
  content: string;
};

export type SelfImproveTestRunResult = {
  ok: boolean;
  exitCode: number;
  output: string;
};

export type GenerateSelfImproveTestSpecInput = {
  schema: LoadedSchemaSource;
  toolName?: string;
  toolDescription?: string;
};

export type ProposeSelfImproveFixInput = {
  schema: LoadedSchemaSource;
  currentSpec: SelfImproveTestSpec;
  currentTestSource: string;
  testPath: string;
  failureOutput: string;
  workspaceFiles: SelfImproveWorkspaceFile[];
  attempt: number;
  maxIterations: number;
  toolName?: string;
  toolDescription?: string;
};

export type SelfImproveLlmClient = {
  generateTestSpec(
    input: GenerateSelfImproveTestSpecInput
  ): Promise<SelfImproveTestSpec>;
  proposeFix(input: ProposeSelfImproveFixInput): Promise<SelfImproveFixPlan>;
};

export type SelfImproveRunOptions = {
  schemaLocation: string;
  testPath?: string;
  model?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  maxIterations?: number;
  toolName?: string;
  toolDescription?: string;
  cwd?: string;
};

export type SelfImproveResult = {
  ok: boolean;
  iterations: number;
  testPath: string;
  summary: string;
  lastOutput?: string;
};

export type SelfImproveLogger = (message: string) => void;
