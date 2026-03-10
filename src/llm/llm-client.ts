export interface LlmGenerateRequest {
  systemPrompt: string;
  inputText: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface LlmGenerateResponse {
  text: string;
}

export interface LlmClient {
  generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse>;
}
