import type { TicketActionPlan } from "../core/contracts.js";
import { parseTicketActionPlan, TicketsOutputParseError } from "./tickets-output.js";
import type { TicketToolName } from "./types.js";

const allowedToolNames: TicketToolName[] = ["ticketsQuery", "ticketsCreate", "ticketsUpdate"];

export type TicketModelStep =
  | {
      kind: "final";
      plan: TicketActionPlan;
    }
  | {
      kind: "tool";
      thought?: string;
      toolCall: {
        name: TicketToolName;
        args: Record<string, string>;
      };
    };

export function parseTicketModelStep(rawOutput: string): TicketModelStep {
  const normalizedRawOutput = rawOutput.trim();

  // Backward compatibility: existing final schema is still accepted directly.
  try {
    return {
      kind: "final",
      plan: parseTicketActionPlan(normalizedRawOutput),
    };
  } catch {
    // Continue to ReAct schema parsing.
  }

  const parsed = parseJsonRecord(stripCodeFence(normalizedRawOutput), normalizedRawOutput);

  if (isRecord(parsed.final)) {
    return {
      kind: "final",
      plan: parseTicketActionPlan(JSON.stringify(parsed.final)),
    };
  }

  if (!isRecord(parsed.toolCall)) {
    throw new TicketsOutputParseError(
      "TicketsAgent ReAct step must contain either final plan or toolCall.",
      normalizedRawOutput,
    );
  }

  const toolName = parseToolName(parsed.toolCall.name, normalizedRawOutput);
  const toolArgs = parseStringRecord(parsed.toolCall.args ?? {}, "toolCall.args", normalizedRawOutput);

  return {
    kind: "tool",
    thought: typeof parsed.thought === "string" ? parsed.thought.trim() : undefined,
    toolCall: {
      name: toolName,
      args: toolArgs,
    },
  };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
    return trimmed;
  }

  const lines = trimmed.split("\n");
  if (lines.length < 3) {
    return trimmed;
  }

  return lines.slice(1, -1).join("\n").trim();
}

function parseJsonRecord(text: string, rawOutput: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TicketsOutputParseError("TicketsAgent must return valid JSON.", rawOutput);
  }

  if (!isRecord(parsed)) {
    throw new TicketsOutputParseError("TicketsAgent JSON output must be an object.", rawOutput);
  }

  return parsed;
}

function parseToolName(value: unknown, rawOutput: string): TicketToolName {
  if (typeof value === "string" && allowedToolNames.includes(value as TicketToolName)) {
    return value as TicketToolName;
  }

  throw new TicketsOutputParseError(
    'toolCall.name must be one of: "ticketsQuery", "ticketsCreate", "ticketsUpdate".',
    rawOutput,
  );
}

function parseStringRecord(
  value: unknown,
  fieldName: string,
  rawOutput: string,
): Record<string, string> {
  if (!isRecord(value)) {
    throw new TicketsOutputParseError(`${fieldName} must be an object.`, rawOutput);
  }

  const normalized: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      normalized[key] = entry;
      continue;
    }
    if (typeof entry === "number" || typeof entry === "boolean") {
      normalized[key] = String(entry);
      continue;
    }
    throw new TicketsOutputParseError(
      `${fieldName} must contain only string-like values.`,
      rawOutput,
    );
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
