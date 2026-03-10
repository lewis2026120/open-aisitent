import type { KnowledgeAnswerPlan } from "../core/contracts.js";

export class KnowledgeOutputParseError extends Error {
  constructor(
    message: string,
    readonly rawOutput: string,
  ) {
    super(message);
    this.name = "KnowledgeOutputParseError";
  }
}

export function parseKnowledgeAnswerPlan(rawOutput: string): KnowledgeAnswerPlan {
  const normalizedRawOutput = rawOutput.trim();
  const parsed = parseJsonRecord(stripCodeFence(normalizedRawOutput), normalizedRawOutput);

  return {
    shouldAnswerDirectly: parseRequiredBoolean(
      parsed.shouldAnswerDirectly,
      "shouldAnswerDirectly",
      normalizedRawOutput,
    ),
    suggestedSearchQuery: parseRequiredString(
      parsed.suggestedSearchQuery,
      "suggestedSearchQuery",
      normalizedRawOutput,
    ),
    answerDraft: parseRequiredString(parsed.answerDraft, "answerDraft", normalizedRawOutput),
    citedKnowledgeIds: parseStringArray(
      parsed.citedKnowledgeIds,
      "citedKnowledgeIds",
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
    throw new KnowledgeOutputParseError("KnowledgeAgent must return valid JSON.", rawOutput);
  }

  if (!isRecord(parsed)) {
    throw new KnowledgeOutputParseError(
      "KnowledgeAgent JSON output must be an object.",
      rawOutput,
    );
  }

  return parsed;
}

function parseRequiredString(value: unknown, fieldName: string, rawOutput: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new KnowledgeOutputParseError(`${fieldName} must be a non-empty string.`, rawOutput);
  }

  return value.trim();
}

function parseRequiredBoolean(value: unknown, fieldName: string, rawOutput: string): boolean {
  if (typeof value !== "boolean") {
    throw new KnowledgeOutputParseError(`${fieldName} must be a boolean.`, rawOutput);
  }

  return value;
}

function parseStringArray(value: unknown, fieldName: string, rawOutput: string): string[] {
  if (!Array.isArray(value)) {
    throw new KnowledgeOutputParseError(`${fieldName} must be a string array.`, rawOutput);
  }

  const normalized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new KnowledgeOutputParseError(
        `${fieldName} must contain only non-empty strings.`,
        rawOutput,
      );
    }
    normalized.push(entry.trim());
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
