import { describe, expect, it, vi } from "vitest";
import {
  createMinimaxClientFromEnv,
  DEFAULT_ANTHROPIC_VERSION,
  MinimaxClient,
} from "./minimax-client.js";

describe("MinimaxClient", () => {
  it("sends an Anthropic-compatible messages request and joins text blocks", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            { type: "text", text: "first line" },
            { type: "text", text: "second line" },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = new MinimaxClient({
      apiKey: "test-key",
      model: "MiniMax-M2.5",
      baseUrl: "https://api.minimax.io/anthropic/v1/",
      maxTokens: 2048,
      fetchImpl: fetchMock,
    });

    const result = await client.generate({
      systemPrompt: "You are a support router.",
      inputText: "用户说：请帮我查退款工单进度。",
    });

    expect(result.text).toBe("first line\nsecond line");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.minimax.io/anthropic/v1/messages");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      "Content-Type": "application/json",
      "x-api-key": "test-key",
      "anthropic-version": DEFAULT_ANTHROPIC_VERSION,
    });

    const parsedBody = JSON.parse(String(init?.body));
    expect(parsedBody).toEqual({
      model: "MiniMax-M2.5",
      max_tokens: 2048,
      system: "You are a support router.",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "用户说：请帮我查退款工单进度。" }],
        },
      ],
    });
  });

  it("throws a readable error when the provider rejects the request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: "invalid api key",
          },
        }),
        {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = new MinimaxClient({
      apiKey: "bad-key",
      fetchImpl: fetchMock,
    });

    await expect(
      client.generate({
        systemPrompt: "system",
        inputText: "hello",
      }),
    ).rejects.toThrow("MiniMax request failed (401 Unauthorized). invalid api key");
  });

  it("reads configuration from environment variables", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "ok" }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    vi.stubEnv("MINIMAX_API_KEY", "env-key");
    vi.stubEnv("MINIMAX_BASE_URL", "https://api.minimaxi.com/anthropic");
    vi.stubEnv("MINIMAX_MODEL", "MiniMax-M2.5-Lightning");
    vi.stubEnv("MINIMAX_MAX_TOKENS", "1024");

    const client = createMinimaxClientFromEnv({ fetchImpl: fetchMock });

    await client.generate({
      systemPrompt: "system",
      inputText: "hello",
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.minimaxi.com/anthropic/v1/messages");
    const parsedBody = JSON.parse(String(init?.body));
    expect(parsedBody.model).toBe("MiniMax-M2.5-Lightning");
    expect(parsedBody.max_tokens).toBe(1024);

    vi.unstubAllEnvs();
  });
});
