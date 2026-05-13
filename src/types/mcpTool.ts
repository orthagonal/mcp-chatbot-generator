import { z } from "zod";

export type McpJsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, McpJsonSchema>;
  required?: string[];
  default?: unknown;
  enum?: unknown[];
  items?: McpJsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  additionalProperties?: boolean | McpJsonSchema;
};

export type McpToolDefinition = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: McpJsonSchema;
  outputSchema?: McpJsonSchema;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

export const mcpJsonSchemaSchema: z.ZodType<McpJsonSchema> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    description: z.string().optional(),
    properties: z.record(mcpJsonSchemaSchema).optional(),
    required: z.array(z.string()).optional(),
    default: z.unknown().optional(),
    enum: z.array(z.unknown()).optional(),
    items: mcpJsonSchemaSchema.optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    additionalProperties: z.union([z.boolean(), mcpJsonSchemaSchema]).optional()
  })
);

export const mcpToolDefinitionSchema: z.ZodType<McpToolDefinition> = z.object({
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  inputSchema: mcpJsonSchemaSchema,
  outputSchema: mcpJsonSchemaSchema.optional(),
  annotations: z
    .object({
      readOnlyHint: z.boolean().optional(),
      destructiveHint: z.boolean().optional(),
      idempotentHint: z.boolean().optional(),
      openWorldHint: z.boolean().optional()
    })
    .optional()
});
