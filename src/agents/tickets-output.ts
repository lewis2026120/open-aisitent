import type { TicketActionPlan } from "../core/contracts.js";

const allowedActions = ["query", "create", "update"] as const;

export class TicketsOutputParseError extends Error {
  constructor(
    message: string,
    readonly rawOutput: string,
  ) {
    super(message);
    this.name = "TicketsOutputParseError";
  }
}

export function parseTicketActionPlan(rawOutput: string): TicketActionPlan {
  const normalizedRawOutput = rawOutput.trim();
  const parsed = parseJsonRecord(stripCodeFence(normalizedRawOutput), normalizedRawOutput);

  return {
    action: parseAction(parsed.action, normalizedRawOutput),
    reason: parseRequiredString(parsed.reason, "reason", normalizedRawOutput),
    ticketFields: parseStringRecord(parsed.ticketFields, "ticketFields", normalizedRawOutput),
    userReplyDraft: parseRequiredString(
      parsed.userReplyDraft,
      "userReplyDraft",
      normalizedRawOutput,
    ),
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

function parseAction(value: unknown, rawOutput: string): TicketActionPlan["action"] {
  if (typeof value === "string" && allowedActions.includes(value as TicketActionPlan["action"])) {
    return value as TicketActionPlan["action"];
  }

  throw new TicketsOutputParseError(
    'action must be one of: "query", "create", "update".',
    rawOutput,
  );
}

function parseRequiredString(value: unknown, fieldName: string, rawOutput: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TicketsOutputParseError(`${fieldName} must be a non-empty string.`, rawOutput);
  }

  return value.trim();
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
