import { z } from "zod";
import { mcpToolDefinitionSchema } from "../types/mcpTool.js";

export const compileOptionsSchema = z.object({
  namespace: z.string().optional(),
  allowWriteCommands: z.boolean().optional(),
  allowDestructiveCommands: z.boolean().optional(),
  requireConfirmationForWrites: z.boolean().optional(),
  includeRegexMatchers: z.boolean().optional(),
  maxAliasesPerTool: z.number().int().positive().optional()
});

export const selfImproveMatchCaseSchema = z.object({
  input: z.string().min(1),
  toolName: z.string().optional(),
  args: z.record(z.unknown()).optional(),
  source: z.enum(["exact", "prefix", "regex", "builtin"]).optional(),
  requiresConfirmation: z.boolean().optional()
});

export const selfImproveFallbackCaseSchema = z.object({
  input: z.string().min(1),
  reasonIncludes: z.string().min(1).optional()
});

export const selfImproveTestSpecSchema = z.object({
  title: z.string().min(1),
  rationale: z.string().optional(),
  options: compileOptionsSchema.optional(),
  tools: mcpToolDefinitionSchema.array().min(1),
  matches: z.array(selfImproveMatchCaseSchema).min(1),
  fallbacks: z.array(selfImproveFallbackCaseSchema).min(1)
});

export const selfImproveFileUpdateSchema = z.object({
  path: z.string().min(1),
  content: z.string()
});

export const selfImproveFixPlanSchema = z.object({
  status: z.enum(["fix", "give_up"]),
  summary: z.string().min(1),
  updatedSpec: selfImproveTestSpecSchema.optional(),
  fileUpdates: z.array(selfImproveFileUpdateSchema).default([])
});

export type SelfImproveTestSpec = z.infer<typeof selfImproveTestSpecSchema>;
export type SelfImproveFixPlan = z.infer<typeof selfImproveFixPlanSchema>;
export type SelfImproveFileUpdate = z.infer<typeof selfImproveFileUpdateSchema>;
