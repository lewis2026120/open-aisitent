import type { HandoffPlan } from "../core/contracts.js";

const allowedUrgencies = ["normal", "urgent"] as const;

export class HandoffOutputParseError extends Error {
  constructor(
    message: string,
    readonly rawOutput: string,
  ) {
    super(message);
    this.name = "HandoffOutputParseError";
  }
}

export function parseHandoffPlan(rawOutput: string): HandoffPlan {
  const normalizedRawOutput = rawOutput.trim();
  const parsed = parseJsonRecord(stripCodeFence(normalizedRawOutput), normalizedRawOutput);

  return {
    handoffReason: parseRequiredString(parsed.handoffReason, "handoffReason", normalizedRawOutput),
    urgency: parseUrgency(parsed.urgency, normalizedRawOutput),
    summaryForHuman: parseRequiredString(parsed.summaryForHuman, "summaryForHuman", normalizedRawOutput),
    attachmentPayload: parseOptionalString(parsed.attachmentPayload, "attachmentPayload") || `source=handoff;timestamp=${new Date().toISOString()}`,
    userReplyDraft: parseRequiredString(parsed.userReplyDraft, "userReplyDraft", normalizedRawOutput),
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
    throw new HandoffOutputParseError("HandoffToHumanAgent must return valid JSON.", rawOutput);
  }

  if (!isRecord(parsed)) {
    throw new HandoffOutputParseError(
      "HandoffToHumanAgent JSON output must be an object.",
      rawOutput,
    );
  }

  return parsed;
}

function parseUrgency(value: unknown, rawOutput: string): HandoffPlan["urgency"] {
  if (typeof value === "string" && allowedUrgencies.includes(value as HandoffPlan["urgency"])) {
    return value as HandoffPlan["urgency"];
  }

  throw new HandoffOutputParseError('urgency must be either "normal" or "urgent".', rawOutput);
}

function parseRequiredString(value: unknown, fieldName: string, rawOutput: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HandoffOutputParseError(`${fieldName} must be a non-empty string.`, rawOutput);
  }

  return value.trim();
}

function parseOptionalString(value: unknown, fieldName: string): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
