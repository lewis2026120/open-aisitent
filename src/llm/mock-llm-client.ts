import type {
  LlmClient,
  LlmGenerateRequest,
  LlmGenerateResponse,
} from "./llm-client.js";

export type MockLlmResolver = (
  request: LlmGenerateRequest,
) => Promise<string | LlmGenerateResponse> | string | LlmGenerateResponse;

export class MockLlmClient implements LlmClient {
  constructor(private readonly resolver: MockLlmResolver) {}

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const result = await this.resolver(request);
    return typeof result === "string" ? { text: result } : result;
  }

  static fromText(text: string): MockLlmClient {
    return new MockLlmClient(() => text);
  }
}
