import { z } from "zod";
import { buildSelfImproveFixPrompt, buildSelfImproveTestSpecPrompt } from "./prompts.js";
import {
  selfImproveFixPlanSchema,
  selfImproveTestSpecSchema
} from "./testSpec.js";
import type {
  GenerateSelfImproveTestSpecInput,
  ProposeSelfImproveFixInput,
  SelfImproveLlmClient
} from "./types.js";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

function resolveChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

function extractMessageContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }

      return "";
    })
    .join("");
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("LLM response was empty.");
  }

  const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");

  if (objectStart >= 0 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  return trimmed;
}

async function requestJson<T>(input: {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  outputSchema: z.ZodType<T>;
}): Promise<T> {
  const response = await fetch(resolveChatCompletionsUrl(input.apiBaseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0,
      messages: input.messages
    }),
    signal: AbortSignal.timeout(120_000)
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(
      `LLM request failed with status ${response.status}: ${rawBody.slice(0, 400)}`
    );
  }

  const parsedBody = JSON.parse(rawBody) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const content = extractMessageContent(parsedBody.choices?.[0]?.message?.content);
  const payload = extractJsonPayload(content);

  return input.outputSchema.parse(JSON.parse(payload));
}

export function createSelfImproveLlmClient(input: {
  apiBaseUrl?: string;
  apiKey: string;
  model: string;
}): SelfImproveLlmClient {
  const apiBaseUrl = input.apiBaseUrl ?? "https://api.openai.com/v1";

  return {
    async generateTestSpec(
      generateInput: GenerateSelfImproveTestSpecInput
    ) {
      return requestJson({
        apiBaseUrl,
        apiKey: input.apiKey,
        model: input.model,
        outputSchema: selfImproveTestSpecSchema,
        messages: [
          {
            role: "system",
            content:
              "You generate strict JSON for mcp-command-compiler self-improvement."
          },
          {
            role: "user",
            content: buildSelfImproveTestSpecPrompt(generateInput)
          }
        ]
      });
    },
    async proposeFix(fixInput: ProposeSelfImproveFixInput) {
      return requestJson({
        apiBaseUrl,
        apiKey: input.apiKey,
        model: input.model,
        outputSchema: selfImproveFixPlanSchema,
        messages: [
          {
            role: "system",
            content:
              "You return strict JSON and only propose minimal, high-confidence fixes."
          },
          {
            role: "user",
            content: buildSelfImproveFixPrompt(fixInput)
          }
        ]
      });
    }
  };
}
