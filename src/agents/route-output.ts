import type { AgentRoute, RouteDecision } from "../core/contracts.js";

const allowedRoutes: AgentRoute[] = ["knowledge", "tickets", "handoff"];

export class RouteOutputParseError extends Error {
  constructor(
    message: string,
    readonly rawOutput: string,
  ) {
    super(message);
    this.name = "RouteOutputParseError";
  }
}

export function parseRouteDecision(rawOutput: string): RouteDecision {
  const normalizedRawOutput = rawOutput.trim();
  const parsed = parseJsonRecord(stripCodeFence(normalizedRawOutput), normalizedRawOutput);
  const route = parseRoute(parsed.route, normalizedRawOutput);
  const intent = parseRequiredString(parsed.intent, "intent", normalizedRawOutput);
  const confidence = parseConfidence(parsed.confidence, normalizedRawOutput);
  const reason = parseRequiredString(parsed.reason, "reason", normalizedRawOutput);
  const entities = normalizeEntities(parsed.entities);

  return {
    route,
    intent,
    confidence,
    reason,
    entities,
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
    throw new RouteOutputParseError("ServiceAgent must return valid JSON.", rawOutput);
  }

  if (!isRecord(parsed)) {
    throw new RouteOutputParseError("ServiceAgent JSON output must be an object.", rawOutput);
  }

  return parsed;
}

function parseRoute(value: unknown, rawOutput: string): AgentRoute {
  if (typeof value === "string" && allowedRoutes.includes(value as AgentRoute)) {
    return value as AgentRoute;
  }

  throw new RouteOutputParseError(
    'Route must be one of: "knowledge", "tickets", "handoff".',
    rawOutput,
  );
}

function parseRequiredString(value: unknown, fieldName: string, rawOutput: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RouteOutputParseError(`${fieldName} must be a non-empty string.`, rawOutput);
  }

  return value.trim();
}

function parseConfidence(value: unknown, rawOutput: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RouteOutputParseError("confidence must be a number between 0 and 1.", rawOutput);
  }

  return value;
}

function normalizeEntities(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      normalized[key] = entry;
      continue;
    }
    if (typeof entry === "number" || typeof entry === "boolean") {
      normalized[key] = String(entry);
    }
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
