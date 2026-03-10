import type { LlmClient, LlmGenerateRequest, LlmGenerateResponse } from "./llm-client.js";

export const DEFAULT_MINIMAX_BASE_URL = "https://api.minimax.io/anthropic";
export const DEFAULT_MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/anthropic";
export const DEFAULT_MINIMAX_MODEL = "MiniMax-M2.5";
export const DEFAULT_MINIMAX_MAX_TOKENS = 8192;
export const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";

type FetchLike = typeof fetch;

type MinimaxContentBlock = {
  type?: string;
  text?: string;
};

type MinimaxErrorPayload = {
  error?: {
    type?: string;
    message?: string;
  };
};

type MinimaxMessageResponse = MinimaxErrorPayload & {
  content?: MinimaxContentBlock[];
};

export interface MinimaxClientConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  anthropicVersion?: string;
  fetchImpl?: FetchLike;
}

export interface MinimaxEnvConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  anthropicVersion?: string;
  fetchImpl?: FetchLike;
}

export class MinimaxClient implements LlmClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly maxTokens: number;
  private readonly anthropicVersion: string;
  private readonly fetchImpl: FetchLike;

  constructor(config: MinimaxClientConfig) {
    this.apiKey = normalizeRequiredString(config.apiKey, "MiniMax apiKey");
    this.model = normalizeRequiredString(config.model ?? DEFAULT_MINIMAX_MODEL, "MiniMax model");
    this.baseUrl = normalizeAnthropicBaseUrl(config.baseUrl ?? DEFAULT_MINIMAX_BASE_URL);
    this.maxTokens = normalizePositiveInteger(config.maxTokens ?? DEFAULT_MINIMAX_MAX_TOKENS, "MiniMax maxTokens");
    this.anthropicVersion = normalizeRequiredString(
      config.anthropicVersion ?? DEFAULT_ANTHROPIC_VERSION,
      "MiniMax anthropicVersion",
    );
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const payload = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: request.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: request.inputText,
            },
          ],
        },
      ],
    };

    const response = await this.fetchImpl(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": this.anthropicVersion,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await buildRequestFailureMessage(response));
    }

    const json = (await response.json().catch(() => null)) as MinimaxMessageResponse | null;
    if (!json || !Array.isArray(json.content)) {
      throw new Error("MiniMax response did not include a valid content array.");
    }

    const text = json.content
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text!.trim())
      .filter((blockText) => blockText.length > 0)
      .join("\n")
      .trim();

    if (!text) {
      throw new Error("MiniMax response contained no text output.");
    }

    return { text };
  }

  getConfig() {
    return {
      model: this.model,
      baseUrl: this.baseUrl,
      maxTokens: this.maxTokens,
      anthropicVersion: this.anthropicVersion,
    };
  }
}

export function createMinimaxClientFromEnv(config: MinimaxEnvConfig = {}): MinimaxClient {
  const apiKey = config.apiKey ?? process.env.MINIMAX_API_KEY ?? "";
  const baseUrl = config.baseUrl ?? process.env.MINIMAX_BASE_URL ?? DEFAULT_MINIMAX_BASE_URL;
  const model = config.model ?? process.env.MINIMAX_MODEL ?? DEFAULT_MINIMAX_MODEL;
  const maxTokens =
    config.maxTokens ?? parseIntegerFromEnv(process.env.MINIMAX_MAX_TOKENS) ?? DEFAULT_MINIMAX_MAX_TOKENS;
  const anthropicVersion =
    config.anthropicVersion ?? process.env.MINIMAX_ANTHROPIC_VERSION ?? DEFAULT_ANTHROPIC_VERSION;

  return new MinimaxClient({
    apiKey,
    baseUrl,
    model,
    maxTokens,
    anthropicVersion,
    fetchImpl: config.fetchImpl,
  });
}

async function buildRequestFailureMessage(response: Response): Promise<string> {
  const fallback = `MiniMax request failed (${response.status} ${response.statusText}).`;
  const textBody = await response.text().catch(() => "");
  if (!textBody.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(textBody) as MinimaxErrorPayload;
    const errorMessage = parsed.error?.message?.trim();
    if (errorMessage) {
      return `${fallback} ${errorMessage}`;
    }
  } catch {
    // Ignore invalid JSON error body and fall back to raw text.
  }

  return `${fallback} ${textBody.slice(0, 400).trim()}`;
}

function normalizeAnthropicBaseUrl(baseUrl: string): string {
  const trimmed = normalizeRequiredString(baseUrl, "MiniMax baseUrl").replace(/\/+$/, "");
  return trimmed.replace(/\/v1$/, "");
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function normalizePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return value;
}

function parseIntegerFromEnv(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}
